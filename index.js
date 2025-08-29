import { useState } from "react";

export default function Home() {
  const [step, setStep] = useState("register");
  const [vaultAddress, setVaultAddress] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  // ------------------ REGISTER ------------------
  const handleRegister = async () => {
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerWallet: "OWNER_WALLET_ADDRESS",
          nomineeWallet: "NOMINEE_WALLET_ADDRESS",
          nomineeContact: "nominee@email.com",
          secretHash: "0x00",
          heartbeatInterval: 4320,
          gracePeriod: 1008,
          password: "mypassword",
          salt: "mysalt",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setVaultAddress(data.vaultAddress);
        setMessage("✅ Vault created: " + data.vaultAddress);
        setStep("enroll-otp");
      } else {
        setMessage("❌ Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to register vault.");
    }
  };

  // ------------------ ENROLL: START OTP ------------------
  const handleEnrollStartOtp = async () => {
    const res = await fetch("/api/enroll/start-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultAddress,
        contact: "nominee@email.com",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("OTP sent (demo: " + data.otp + ")");
      setStep("enroll-verify");
    } else {
      setMessage("❌ " + data.error);
    }
  };

  // ------------------ ENROLL: VERIFY ------------------
  const handleEnrollVerify = async () => {
    const res = await fetch("/api/enroll/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vaultAddress,
        contact: "nominee@email.com",
        otp,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("✅ Enrolled successfully!");
      setStep("claim-otp");
    } else {
      setMessage("❌ " + data.error);
    }
  };

  // ------------------ CLAIM: START OTP ------------------
  const handleClaimStartOtp = async () => {
    const res = await fetch("/api/claim/start-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultAddress }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Claim OTP sent (demo: " + data.otp + ")");
      setStep("claim-verify");
    } else {
      setMessage("❌ " + data.error);
    }
  };

  // ------------------ CLAIM: VERIFY ------------------
  const handleClaimVerify = async () => {
    const res = await fetch("/api/claim/verify-and-execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultAddress, otp }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("✅ Claim successful! TxID: " + data.txId);
    } else {
      setMessage("❌ " + data.error);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>⚡ StackSafe Demo</h1>
      <p>{message}</p>

      {step === "register" && (
        <button onClick={handleRegister}>1️⃣ Register Vault</button>
      )}

      {step === "enroll-otp" && (
        <button onClick={handleEnrollStartOtp}>2️⃣ Send OTP to Nominee</button>
      )}

      {step === "enroll-verify" && (
        <div>
          <input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleEnrollVerify}>3️⃣ Verify Enrollment</button>
        </div>
      )}

      {step === "claim-otp" && (
        <button onClick={handleClaimStartOtp}>4️⃣ Start Claim</button>
      )}

      {step === "claim-verify" && (
        <div>
          <input
            placeholder="Enter Claim OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleClaimVerify}>5️⃣ Verify Claim</button>
        </div>
      )}
    </div>
  );
}
