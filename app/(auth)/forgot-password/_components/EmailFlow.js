"use client";

import { resetPasswordByEmailOTP, sendResetEmail } from "@/backend/serverActions/authActions";
import { useState } from "react";

export function EmailFlow() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  async function handleSubmit(formData) {
    setLoading(true);

    const res = await sendResetEmail({ formData });

    setMessage(res?.success || res?.error);
    if (res?.success) {
      setEmail(String(formData.get("email") || "").trim().toLowerCase());
      setCodeSent(true);
    }
    setLoading(false);
  }

  async function handlePasswordUpdate(formData) {
    setLoading(true);
    const res = await resetPasswordByEmailOTP({ email, otp: formData.get("otp"), password: formData.get("password") });
    setMessage(res?.success || res?.error);
    if (res?.success) setCodeSent(false);
    setLoading(false);
  }

  return (
    <div className="mt-4">
      {!codeSent ? <form action={handleSubmit}>
        <input type="email" name="email" placeholder="Enter your email" className="mb-3 w-full rounded border p-2" required />
        <button className="w-full rounded bg-blue-500 py-2 text-white" disabled={loading}>{loading ? "Sending..." : "Send reset code"}</button>
      </form> : <form action={handlePasswordUpdate}>
        <p className="mb-3 text-sm text-white">Code sent to {email}. It expires in 10 minutes.</p>
        <input type="text" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit code" className="mb-3 w-full rounded border p-2" required />
        <input type="password" name="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="New password (8+ characters)" className="mb-3 w-full rounded border p-2" required />
        <button className="w-full rounded bg-blue-500 py-2 text-white" disabled={loading}>{loading ? "Updating..." : "Verify code and update password"}</button>
        <button type="button" onClick={() => { setCodeSent(false); setMessage(""); }} className="mt-2 text-sm text-white underline">Send a new code</button>
      </form>}

      {message && <p className="mt-2 text-lg text-white">{message}</p>}
    </div>
  );
}
