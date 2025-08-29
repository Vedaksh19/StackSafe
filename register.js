import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      ownerWallet,
      nomineeWallet,
      nomineeContact,
      secretHash,
      heartbeatInterval,
      gracePeriod,
      password,
      salt,
    } = req.body;

    // 1️⃣ Save vault in Supabase
    const { data, error } = await supabase
      .from("vaults")
      .insert([
        {
          vault_address: "dummy-vault-address", // TODO: replace with real deployed contract address
          owner_wallet: ownerWallet,
          nominee_wallet: nomineeWallet,
          nominee_contact: nomineeContact,
          secret_hash: secretHash,
        },
      ])
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      vaultAddress: data[0].vault_address,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to register vault" });
  }
}
