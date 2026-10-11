"use client";

import {
  sendEmailVerificationOTP,
  verifyEmailVerificationOTP,
} from "@/backend/serverActions/authActions";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { useState, useTransition } from "react";

function VerificationStatus({ verified }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
      <CheckCircle2 size={16} /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600">
      <CircleAlert size={16} /> Need verify
    </span>
  );
}

export default function ContactVerification({
  email,
  emailVerified = false,
  phone,
  phoneVerified = false,
}) {
  const [verified, setVerified] = useState(emailVerified);
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSend = () => {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await sendEmailVerificationOTP();
        if (!result?.success) {
          setError(result?.message || "Could not send verification code.");
          return;
        }
        if (result.verified) setVerified(true);
        setCodeSent(true);
        setOtp("");
        setMessage(result.message || "Verification code sent.");
      } catch {
        setError("Could not send verification code. Please try again.");
      }
    });
  };

  const handleVerify = () => {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await verifyEmailVerificationOTP({ otp });
        if (!result?.success) {
          setError(result?.message || "Email verification failed.");
          return;
        }
        setVerified(true);
        setCodeSent(false);
        setOtp("");
        setMessage(result.message || "Email verified.");
      } catch {
        setError("Email verification failed. Please try again.");
      }
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <section className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Email</p>
            <p className="mt-1 break-all text-sm font-medium text-text-primary">{email || "—"}</p>
          </div>
          <VerificationStatus verified={verified} />
        </div>
        {!verified && (
          <div className="mt-3 space-y-3">
            <button type="button" className="button" onClick={handleSend} disabled={isPending || !email}>
              {isPending ? "Please wait…" : codeSent ? "Resend code" : "Send verification code"}
            </button>
            {codeSent && (
              <div className="flex flex-wrap gap-2">
                <input
                  aria-label="Email verification code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit code"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
                />
                <button type="button" className="button" onClick={handleVerify} disabled={isPending || otp.length !== 6}>
                  Verify email
                </button>
              </div>
            )}
          </div>
        )}
        {message && <p role="status" className="mt-2 text-sm text-emerald-600">{message}</p>}
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </section>

      <section className="rounded-xl border border-border p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Phone</p>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="break-all text-sm font-medium text-text-primary">{phone || "—"}</p>
          <VerificationStatus verified={phoneVerified} />
        </div>
        {!phoneVerified && phone && (
          <p className="mt-2 text-xs text-text-muted">SMS verification will be available later.</p>
        )}
      </section>
    </div>
  );
}
