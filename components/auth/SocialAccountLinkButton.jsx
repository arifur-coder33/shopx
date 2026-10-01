"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SocialAccountLinkButton({ provider, connected, enabled }) {
  const [connecting, setConnecting] = useState(false);
  const label = provider === "facebook" ? "Facebook" : "Google";

  async function connectAccount() {
    if (!enabled || connecting || connected) return;
    setConnecting(true);
    try {
      await signIn(provider, { callbackUrl: "/my-account" });
    } catch {
      setConnecting(false);
    }
  }

  if (connected) {
    return <p className="text-sm font-semibold text-success">✓ {label} account connected</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={connectAccount}
        disabled={!enabled || connecting}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {provider === "facebook" ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-[#0866ff]">
            <path d="M13.5 21v-8.2h2.76l.41-3.2H13.5V7.56c0-.93.26-1.56 1.6-1.56h1.7V3.14A22.7 22.7 0 0 0 14.32 3c-2.46 0-4.15 1.5-4.15 4.27V9.6H7.38v3.2h2.79V21h3.33Z" />
          </svg>
        ) : (
          <span aria-hidden="true" className="text-lg font-black text-primary">G</span>
        )}
        {connecting ? `Connecting ${label}…` : `Connect ${label} account`}
      </button>
      {!enabled && <p className="text-xs text-text-muted">{label} login credentials are not configured.</p>}
    </div>
  );
}
