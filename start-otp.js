import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { vaultAddress, contact } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

    // Save OTP in Supabase
    const { error } = await supabase.from("otps").insert([
      {
        vault_address: vaultAddress,
        contact,
        otp,
        purpose: "enroll",
      },
    ]);

    if (error) throw error;

    res.status(200).json({ success: true, otp }); // ⚠️ in real app, send via email/SMS instead of returning
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to start OTP" });
  }
}

