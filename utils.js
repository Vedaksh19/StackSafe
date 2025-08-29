import { broadcastTransaction } from "@stacks/transactions";
import CryptoJS from "crypto-js";
import { StacksTestnet } from "@stacks/network";
import { createClient } from "@supabase/supabase-js";

export const network = new StacksTestnet();

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

export const encryptData = (data) =>
  CryptoJS.AES.encrypt(data, process.env.ENCRYPTION_SECRET).toString();

export const decryptData = (ciphertext) =>
  CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_SECRET).toString(
    CryptoJS.enc.Utf8
  );

export async function broadcastAndMonitor(transaction) {
  const result = await broadcastTransaction(transaction, network);
  if (result.error) {
    throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
  }
  return result.txid;
}
