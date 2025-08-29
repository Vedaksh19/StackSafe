import { supabase } from "../../../lib/utils";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { vaultAddress, contact, otp } = req.body;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: validOTP } = await supabase
    .from("otps")
    .select("*")
    .eq("contact", contact)
    .eq("otp", otp)
    .gte("created_at", fiveMinutesAgo)
    .single();

  if (!validOTP) return res.status(400).json({ error: "Invalid or expired OTP." });

  await supabase
    .from("users")
    .update({ is_nominee_enrolled: true })
    .eq("vault_address", vaultAddress)
    .eq("nominee_contact", contact);

  await supabase.from("otps").delete().eq("id", validOTP.id);

  res.json({ success: true, message: "Nominee enrolled successfully!" });
}
