"use client";

import { saveEmailConfigurationAction, sendEmailTestAction } from "@/backend/serverActions/emailSupportAction";
import { Check, Copy, Save } from "lucide-react";
import { useState, useTransition } from "react";

const input = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none focus:border-primary disabled:opacity-60";
const toggles = [
  ["emailVerificationEnabled", "Email verification OTP", "Registration and profile email verification codes"],
  ["passwordResetEnabled", "Password reset OTP", "6-digit password reset codes"],
  ["orderConfirmationEnabled", "Order confirmation", "Email customers when a new order is placed"],
  ["orderStatusEnabled", "Order timeline updates", "Email customers when an order status update is added to its timeline"],
  ["deliverySuccessEnabled", "Delivery success email", "Email customers separately when an order is marked delivered"],
];

export default function EmailConfigurationForm({ initial, webhookUrl, canUpdate, encryptionReady }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [testTo, setTestTo] = useState("");
  const [apiKeyReady, setApiKeyReady] = useState(initial.resendApiKeyConfigured);
  const [copied, setCopied] = useState(false);
  const disabled = pending || !canUpdate;
  const save = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveEmailConfigurationAction(formData);
      setMessage(result.message || (result.success ? "Saved." : "Save failed."));
      if (result.success && (formData.get("resendApiKey") || initial.resendApiKeyConfigured) && formData.get("clearResendApiKey") !== "true") setApiKeyReady(true);
    });
  };
  const sendTest = () => startTransition(async () => {
    const result = await sendEmailTestAction(testTo);
    setMessage(result.message || "Test email failed.");
  });

  return <form onSubmit={save} className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <header><h1 className="text-2xl font-bold text-text">Resend Email Configuration</h1><p className="mt-1 text-sm text-text-muted">এক জায়গা থেকে transactional mail, support inbox, এবং কোন email যাবে তা নিয়ন্ত্রণ করুন। API key ও webhook secret encrypted অবস্থায় সংরক্ষিত হয়।</p></header>
    {!encryptionReady && <p className="rounded-xl bg-amber-100 p-3 text-sm text-amber-900">PROVIDER_CREDENTIAL_ENCRYPTION_KEY (কমপক্ষে ৩২ অক্ষর) configure না করা পর্যন্ত secret নিরাপদে save করা যাবে না।</p>}
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
      <h2 className="font-bold text-text">Resend connection</h2>
      <label className="block text-sm font-semibold">Resend API key <span className="text-text-muted">{initial.resendApiKeyConfigured ? "(saved; blank রাখলে থাকবে)" : ""}</span><input name="resendApiKey" type="password" autoComplete="new-password" disabled={disabled || !encryptionReady} className={`${input} mt-1`} placeholder={initial.resendApiKeyConfigured ? "Saved API key" : "re_..."} /></label>
      {initial.resendApiKeyConfigured && <label className="flex items-center gap-2 text-sm text-danger"><input type="checkbox" name="clearResendApiKey" value="true" disabled={disabled} /> Remove saved API key</label>}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Verified sender email<input name="fromEmail" type="email" defaultValue={initial.fromEmail} required disabled={disabled} className={`${input} mt-1`} placeholder="support@yourdomain.com" /></label>
        <label className="block text-sm font-semibold">Sender name<input name="fromName" defaultValue={initial.fromName} maxLength={120} disabled={disabled} className={`${input} mt-1`} placeholder="Ecru Support" /></label>
      </div>
      <label className="block text-sm font-semibold">Inbound support email address<input name="supportInboxEmail" type="email" defaultValue={initial.supportInboxEmail} disabled={disabled} className={`${input} mt-1`} placeholder="Your Resend receiving address" /><span className="mt-1 block text-xs font-normal text-text-muted">Resend Receiving Emails-এ পাওয়া address এখানে দিন এবং সেটিকে webhook-এর সঙ্গে যুক্ত করুন।</span></label>
      <label className="block text-sm font-semibold">Webhook signing secret <span className="text-text-muted">{initial.webhookSigningSecretConfigured ? "(saved; blank রাখলে থাকবে)" : ""}</span><input name="webhookSigningSecret" type="password" autoComplete="new-password" disabled={disabled || !encryptionReady} className={`${input} mt-1`} placeholder={initial.webhookSigningSecretConfigured ? "Saved webhook secret" : "whsec_..."} /></label>
      {initial.webhookSigningSecretConfigured && <label className="flex items-center gap-2 text-sm text-danger"><input type="checkbox" name="clearWebhookSigningSecret" value="true" disabled={disabled} /> Remove saved webhook secret</label>}
      <div><span className="text-sm font-semibold">Webhook endpoint</span><div className="mt-1 flex gap-2"><input readOnly value={webhookUrl} className={`${input} min-w-0`} /><button type="button" onClick={async () => { await navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }} className="rounded-xl border border-border px-3" aria-label="Copy webhook URL">{copied ? <Check size={17} /> : <Copy size={17} />}</button></div><p className="mt-1 text-xs text-text-muted">Resend Dashboard → Webhooks-এ URL যোগ করে শুধু <code>email.received</code> event চালু করুন।</p></div>
      <div className="flex flex-wrap items-end gap-2"><label className="min-w-56 flex-1 text-sm font-semibold">Test recipient<input type="email" value={testTo} onChange={(event) => setTestTo(event.target.value)} className={`${input} mt-1`} placeholder="you@example.com" disabled={disabled} /></label><button type="button" onClick={sendTest} disabled={disabled || !apiKeyReady} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">Send test email</button></div>
    </section>
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4 sm:p-6"><h2 className="font-bold text-text">Transactional email controls</h2>{toggles.map(([key, title, detail]) => <div key={key} className="flex items-center justify-between gap-4 border-t border-border py-3"><div><p className="text-sm font-semibold text-text">{title}</p><p className="text-xs text-text-muted">{detail}</p></div><input type="hidden" name={key} value="false" /><input aria-label={title} type="checkbox" name={key} value="true" defaultChecked={initial[key]} disabled={disabled} className="h-5 w-5 accent-primary" /></div>)}</section>
    <div className="flex items-center justify-between gap-3"><p aria-live="polite" className="text-sm text-text-muted">{message}</p><button type="submit" disabled={disabled || !encryptionReady} className="button inline-flex items-center gap-2"><Save size={16} />{pending ? "Saving…" : "Save email settings"}</button></div>
  </form>;
}
