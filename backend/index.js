// backend/index.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import stacksNetwork from '@stacks/network';
const { StacksTestnet } = stacksNetwork;
import {
  makeContractDeploy,
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  stringAsciiCV,
} from '@stacks/transactions';
import CryptoJS from 'crypto-js';

// --- INITIAL SETUP ---
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// --- FRONTEND SETUP ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend from /public
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SUPABASE SETUP ---
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- STACKS BLOCKCHAIN SETUP ---
const network = new StacksTestnet();

// --- HELPER FUNCTIONS ---
const encryptData = (data) => CryptoJS.AES.encrypt(data, process.env.ENCRYPTION_SECRET).toString();
const decryptData = (ciphertext) => CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_SECRET).toString(CryptoJS.enc.Utf8);
const hashData = (data) => CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);

async function broadcastAndMonitor(transaction) {
  const result = await broadcastTransaction(transaction, network);
  if (result.error) {
    console.error("Transaction broadcast error:", result);
    throw new Error(`Transaction failed: ${result.reason} - ${JSON.stringify(result.reason_data)}`);
  }
  return result.txid;
}

// ----------------- API ENDPOINTS -----------------

app.post('/register', async (req, res) => {
  const { ownerWallet, nomineeWallet, nomineeContact, secretHash, heartbeatInterval, gracePeriod, password, salt, passphrase } = req.body;
  if (!passphrase || !nomineeContact) {
    return res.status(400).json({ error: 'Passphrase and nominee contact are required.' });
  }

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: nomineeContact,
      email_confirm: true,
    });
    if (authError) throw new Error(`Supabase Auth user creation failed: ${authError.message}`);
    const nominee_auth_id = authData.user.id;

    const passphrase_hash = hashData(passphrase);
    let contractCode = await fs.readFile('./contracts/vault.clar', 'utf8');
    contractCode = contractCode
      .replace(/'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3KZJ273ANAFSF/g, `'${nomineeWallet}'`)
      .replace(/0x00/g, secretHash)
      .replace(/u4320/g, `u${heartbeatInterval}`)
      .replace(/u1008/g, `u${gracePeriod}`);

    const contractName = `stacksafe-vault-${Date.now()}`;
    const transaction = await makeContractDeploy({
      contractName, codeBody: contractCode, senderKey: process.env.STACKS_PRIVATE_KEY, network, anchorMode: AnchorMode.Any,
    });
    const txId = await broadcastAndMonitor(transaction);
    const vaultAddress = `${process.env.STACKS_DEPLOYER_ADDRESS}.${contractName}`;
    const encryptedPassword = encryptData(JSON.stringify({ password, salt }));

    const { data: user, error } = await supabase
      .from('users')
      .insert([{ owner_wallet: ownerWallet, nominee_wallet: nomineeWallet, nominee_contact: nomineeContact, secret_hash: secretHash, encrypted_password: encryptedPassword, vault_address: vaultAddress, tx_id: txId, passphrase_hash, nominee_auth_id }])
      .select().single();
    if (error) throw error;
    res.status(201).json({ message: 'Vault deployed!', vaultAddress, userId: user.id });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: error.message || 'Failed to deploy vault.' });
  }
});

app.post('/enroll/start-otp', async (req, res) => {
  const { contact } = req.body;
  try {
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('nominee_contact', contact).single();
    if (userError || !user) return res.status(404).json({ error: 'No matching vault found for this contact.' });
    if (user.is_nominee_enrolled) return res.status(400).json({ error: 'Nominee is already enrolled.' });

    const { error: otpError } = await supabase.auth.signInWithOtp({ email: contact });
    if (otpError) throw otpError;

    res.json({ message: 'OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/enroll/verify', async (req, res) => {
  const { vaultAddress, contact, otp, passphrase } = req.body;
  try {
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({ email: contact, token: otp, type: 'email' });
    if (verifyError) throw verifyError;
    if (!verifyData.session) return res.status(400).json({ error: 'Invalid or expired OTP.' });

    const { data: user, error: userError } = await supabase.from('users').select('passphrase_hash').eq('vault_address', vaultAddress).single();
    if (userError || !user) return res.status(404).json({ error: 'Vault not found.' });
    if (hashData(passphrase) !== user.passphrase_hash) return res.status(403).json({ error: 'Incorrect passphrase.' });

    await supabase.from('users').update({ is_nominee_enrolled: true }).eq('vault_address', vaultAddress);
    res.json({ success: true, message: 'Enrollment successful! You are now verified.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/claim/start-otp', async (req, res) => {
  const { vaultAddress } = req.body;
  try {
    const { data: user, error } = await supabase.from('users').select('nominee_contact, is_nominee_enrolled').eq('vault_address', vaultAddress).single();
    if (error || !user) return res.status(404).json({ error: 'Vault not found.' });
    if (!user.is_nominee_enrolled) return res.status(403).json({ error: 'Nominee is not enrolled for this vault.' });

    const { error: otpError } = await supabase.auth.signInWithOtp({ email: user.nominee_contact });
    if (otpError) throw otpError;

    res.json({ message: 'OTP sent for claim verification.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/claim/execute', async (req, res) => {
  const { vaultAddress, otp, passphrase } = req.body;
  try {
    const { data: user, error: userError } = await supabase.from('users').select('*').eq('vault_address', vaultAddress).single();
    if (userError || !user) return res.status(404).json({ error: 'Vault not found.' });

    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({ email: user.nominee_contact, token: otp, type: 'email' });
    if (verifyError) throw verifyError;
    if (!verifyData.session) return res.status(400).json({ error: 'Invalid or expired OTP.' });

    if (hashData(passphrase) !== user.passphrase_hash) return res.status(403).json({ error: 'Incorrect passphrase.' });

    const decrypted = JSON.parse(decryptData(user.encrypted_password));
    const [deployer, contractName] = user.vault_address.split('.');
    const transaction = await makeContractCall({
      contractAddress: deployer, contractName: contractName, functionName: 'claim',
      functionArgs: [stringAsciiCV(decrypted.salt), stringAsciiCV(decrypted.password)],
      senderKey: process.env.STACKS_PRIVATE_KEY, network, postConditionMode: PostConditionMode.Allow,
    });
    const txId = await broadcastAndMonitor(transaction);
    res.json({ success: true, message: 'Verification successful! Claim transaction has been broadcast.', txId });
  } catch (error) {
    console.error('Claim execution failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- SERVER START ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StackSafe backend running on port ${PORT}`));
