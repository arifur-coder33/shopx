"use client";

import {
  resetPassword,
  sendPhoneOTP,
} from "@/backend/serverActions/authActions";
import { useState } from "react";
import OTPInput from "./OTPInput";

export function PhoneFlow() {
  const [step, setStep] = useState(1);
  const [token, setToken] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");

  // 🔥 Step 1: Send OTP
  async function handlePhoneSubmit(formData) {
    const res = await sendPhoneOTP({ formData });

    if (res.error) {
      setMessage(res.error);
      return;
    }

    setToken(res.token);
    setPhone(formData.get("phone"));
    setStep(2);
    setMessage("OTP sent to your phone");
  }

  // 🔥 Step 2: Verify + Reset
  async function handleReset(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const password = formData.get("password");

    const res = await resetPassword({
      token,
      otp,
      password,
    });

    setMessage(res.success || res.error);
  }

  return (
    <div className="mt-4">
      {/* Step 1 */}
      {step === 1 && (
        <form action={handlePhoneSubmit}>
          <input
            name="phone"
            placeholder="Enter phone number"
            className="w-full p-2 border rounded mb-3"
            required
          />

          <button className="w-full bg-green-500 text-white py-2 rounded">
            Send OTP
          </button>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form onSubmit={handleReset}>
          {/* OTP input */}
          <OTPInput value={otp} onChange={setOtp} />

          <input
            name="password"
            type="password"
            placeholder="New Password"
            className="w-full p-2 border rounded mt-3"
            minLength={4}
            required
          />

          <button className="w-full bg-purple-500 text-white py-2 rounded mt-3">
            Reset Password
          </button>
        </form>
      )}

      {message && <p className="mt-2 text-sm">{message}</p>}
    </div>
  );
}
