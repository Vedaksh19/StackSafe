import {
  makeContractCall,
  PostConditionMode,
  stringAsciiCV,
} from "@stacks/transactions";
import { supabase, decryptData, broadcastAndMonitor, network } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { vaultAddress, otp } = req.body;

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("vault_address", vaultAddress)
    .single();

  if (!user) return res.status(404).json({ error: "Vault not found." });

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: validOTP } = await supabase
    .from("otps")
    .select("*")
    .eq("contact", user.nominee_contact)
    .eq("otp", otp)
    .gte("created_at", fiveMinutesAgo)
    .single();

  if (!validOTP) return res.status(400).json({ error: "Invalid or expired OTP." });

  try {
    const decrypted = JSON.parse(decryptData(user.encrypted_password));
    const [deployer, contractName] = user.vault_address.split(".");

    const transaction = await makeContractCall({
      contractAddress: deployer,
      contractName,
      functionName: "claim",
      functionArgs: [
        stringAsciiCV(decrypted.salt),
        stringAsciiCV(decrypted.password),
      ],
      senderKey: process.env.STACKS_PRIVATE_KEY,
      network,
      postConditionMode: PostConditionMode.Allow,
    });

    const txId = await broadcastAndMonitor(transaction);
    await supabase.from("otps").delete().eq("id", validOTP.id);

    res.json({ success: true, message: "Claim successful!", txId });
  } catch (err) {
    console.error("Claim failed:", err);
    res.status(500).json({ error: "Error during claim." });
  }
}
