"use client";

import {
  revealChatCredentialAction,
  saveChatSettingsAction,
} from "@/backend/serverActions/chatActions";
import { CheckCircle2, Copy, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const secretFields = [
  [
    "whatsappPhoneNumberId",
    "WhatsApp Phone Number ID",
    "WhatsApp Cloud API Setup থেকে",
  ],
  ["whatsappAccessToken", "WhatsApp Access Token", "Meta System User token"],
  ["messengerPageId", "Facebook Page ID", "যে Page-এর Messenger যুক্ত করবেন"],
  [
    "messengerPageAccessToken",
    "Messenger Page Access Token",
    "সংশ্লিষ্ট Facebook Page-এর token",
  ],
  ["metaAppSecret", "Meta App Secret", "Meta App Settings → Basic"],
  [
    "webhookVerifyToken",
    "Webhook Verify Token",
    "নিজে বানানো গোপন phrase; Meta dashboard-এ একইটি দিন",
  ],
  [
    "graphApiVersion",
    "Meta Graph API Version",
    "যেমন vXX.0; Meta app-এর supported version দিন",
  ],
];

export default function ChatSettingsForm({
  settings,
  canUpdate,
  webhookUrl,
  encryptionReady,
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});
  const [revealedCredentials, setRevealedCredentials] = useState({});
  const [generatedVerifyToken, setGeneratedVerifyToken] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    if (!canUpdate || saving) return;
    setSaving(true);
    setMessage("");
    const result = await saveChatSettingsAction(
      new FormData(event.currentTarget),
    );
    setMessage(
      result.message || (result.success ? "Saved" : "Could not save settings."),
    );
    if (result.success) router.refresh();
    setSaving(false);
  };

  const copyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const generateVerifyToken = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    setGeneratedVerifyToken(
      Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    );
  };

  const copyVerifyToken = async () => {
    let token = generatedVerifyToken || revealedCredentials.webhookVerifyToken;
    if (!token && settings.configured?.webhookVerifyToken) {
      const result = await revealChatCredentialAction("webhookVerifyToken");
      if (!result.success) {
        setMessage(result.message || "Token copy করা যায়নি।");
        return;
      }
      token = result.data.value;
      setRevealedCredentials((current) => ({ ...current, webhookVerifyToken: token }));
    }
    if (!token) {
      setMessage("আগে নতুন token generate করুন।");
      return;
    }
    try {
      await navigator.clipboard.writeText(token);
      setTokenCopied(true);
      setMessage("Token copied.");
      window.setTimeout(() => setTokenCopied(false), 1800);
    } catch {
      setMessage("Token copy করা যায়নি।");
    }
  };

  const toggleCredential = async (name) => {
    if (showSecrets[name]) {
      setShowSecrets((current) => ({ ...current, [name]: false }));
      return;
    }
    if (
      settings.configured?.[name] &&
      !revealedCredentials[name] &&
      !(name === "webhookVerifyToken" && generatedVerifyToken)
    ) {
      const result = await revealChatCredentialAction(name);
      if (!result.success) {
        setMessage(result.message || "Credential could not be revealed.");
        return;
      }
      setRevealedCredentials((current) => ({
        ...current,
        [name]: result.data.value,
      }));
    }
    setShowSecrets((current) => ({ ...current, [name]: true }));
  };

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 pb-10">
      <header>
        <p className="text-sm font-medium text-primary">Customer Support</p>
        <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">
          Chat Settings
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Website chat এখনই ব্যবহার করুন; Meta channel credentials বসালে
          WhatsApp ও Messenger-ও একই inbox-এ যুক্ত হবে।
        </p>
      </header>
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${encryptionReady ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
      >
        <ShieldCheck className="mt-0.5 shrink-0" size={19} />
        <p>
          {encryptionReady
            ? "Meta credentials database-এ encrypted অবস্থায় save হবে."
            : "Credentials save করার আগে server-এ PROVIDER_CREDENTIAL_ENCRYPTION_KEY (কমপক্ষে 32 অক্ষর) সেট করতে হবে."}
        </p>
      </div>
      <form onSubmit={save} className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div>
            <h2 className="font-bold text-text">Channel controls</h2>
            <p className="mt-1 text-xs text-text-muted">
              সাইটের chat widget ও external channel enable/disable করুন।
            </p>
          </div>
          {[
            ["websiteChatEnabled", "Website chat", settings.websiteChatEnabled],
            ["whatsappEnabled", "WhatsApp inbox", settings.whatsappEnabled],
            ["messengerEnabled", "Messenger inbox", settings.messengerEnabled],
          ].map(([name, label, checked]) => (
            <label
              key={name}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <span className="font-medium text-text">{label}</span>
              <input
                name={name}
                type="checkbox"
                defaultChecked={checked}
                disabled={!canUpdate}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-semibold text-text">
              Website welcome message
            </span>
            <input
              name="welcomeMessage"
              defaultValue={settings.welcomeMessage}
              maxLength={300}
              disabled={!canUpdate}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand disabled:opacity-50"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-text">
              Saved shortcut replies
            </span>
            <span className="mt-1 block text-xs text-text-muted">
              প্রতি লাইনে /shortcut=reply লিখুন; chat input-এ / লিখলে suggestion
              আসবে।
            </span>
            <textarea
              name="quickReplies"
              rows={5}
              defaultValue={(settings.quickReplies || [])
                .map((item) => `/${item.shortcut}=${item.text}`)
                .join("\n")}
              disabled={!canUpdate}
              placeholder="/hello=আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?\n/delivery=ঢাকার ভিতরে ১–২ কর্মদিবসে ডেলিভারি হয়।"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand disabled:opacity-50"
            />
          </label>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
          <div>
            <h2 className="font-bold text-text">Meta webhook</h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Meta Developer App-এর Webhooks settings-এ callback URL ও একই
              verify token ব্যবহার করুন। Incoming WhatsApp এবং Messenger message
              এখানে আসবে।
            </p>
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={webhookUrl}
              aria-label="Meta webhook callback URL"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
            />
            <button
              type="button"
              onClick={copyWebhook}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text"
            >
              {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {secretFields.map(([name, label, hint]) => {
              const secret =
                name !== "whatsappPhoneNumberId" &&
                name !== "messengerPageId" &&
                name !== "graphApiVersion";
              return (
                <label className="block" key={name}>
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                    {label}
                    {settings.configured?.[name]}
                    {name === "webhookVerifyToken" && (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={generateVerifyToken}
                          disabled={!canUpdate}
                          className="button px-3 py-1.5 text-xs disabled:opacity-50"
                        >
                          Generate new
                        </button>
                        <button
                          type="button"
                          onClick={copyVerifyToken}
                          disabled={!canUpdate}
                          aria-label="Webhook token copy করুন"
                          title="Copy token"
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-text disabled:opacity-50"
                        >
                          {tokenCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                          <span>{tokenCopied ? "Copied" : "Copy token"}</span>
                        </button>
                      </span>
                    )}
                  </span>
                  {name === "webhookVerifyToken" && generatedVerifyToken && (
                    <span className="mt-1 block text-xs text-amber-700">
                      নতুন token input-এ বসেছে; সংরক্ষণ করতে Save চাপুন।
                    </span>
                  )}
                  <span className="mt-1 flex rounded-lg border border-border bg-background focus-within:border-brand">
                    <input
                      name={name}
                      value={
                        !secret
                          ? revealedCredentials[name] ?? settings.publicCredentials?.[name] ?? ""
                          : name === "webhookVerifyToken"
                          ? generatedVerifyToken ||
                            revealedCredentials[name] ||
                            ""
                          : revealedCredentials[name] || ""
                      }
                      onChange={(event) => {
                        setRevealedCredentials((current) => ({
                          ...current,
                          [name]: event.target.value,
                        }));
                        if (name === "webhookVerifyToken")
                          setGeneratedVerifyToken(event.target.value);
                      }}
                      type={secret && !showSecrets[name] ? "password" : "text"}
                      placeholder={
                        secret && settings.configured?.[name] &&
                        !revealedCredentials[name] &&
                        !(name === "webhookVerifyToken" && generatedVerifyToken)
                          ? "••••••••••••"
                          : hint
                      }
                      autoComplete="new-password"
                      disabled={!canUpdate}
                      className="min-w-0 flex-1 rounded-lg bg-transparent px-3 py-2 text-sm text-text outline-none disabled:opacity-50"
                    />
                    {secret && (
                      <button
                        type="button"
                        onClick={() => toggleCredential(name)}
                        aria-label={
                          showSecrets[name] ? `${label} hide` : `${label} show`
                        }
                        className="px-3 text-text-muted"
                      >
                        {showSecrets[name] ? (
                          <EyeOff size={16} />
                        ) : (
                          <Eye size={16} />
                        )}
                      </button>
                    )}
                  </span>
                  {settings.configured?.[name] && (
                    <span className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        name={`clear_${name}`}
                        value="true"
                        disabled={!canUpdate}
                        className="accent-[var(--color-brand)]"
                      />
                      Saved credential মুছে দিন
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <p className="text-xs leading-5 text-text-muted">
            Meta app-এ WhatsApp webhook fields এবং Messenger-এর messages ও
            message_reactions fields subscribe করুন।
            Credentials না বসানো পর্যন্ত external channel off রাখুন।
            WhatsApp/Messenger reply delivery Meta-এর account setup, permissions
            ও messaging rules-এর ওপর নির্ভর করে।
          </p>
          <a
            className="text-sm font-semibold text-primary hover:underline"
            href="https://developers.facebook.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open Meta for Developers ↗
          </a>
        </section>
        {message && (
          <p
            role="status"
            className={`rounded-lg p-3 text-sm ${message.toLowerCase().includes("could not") || message.includes("Unauthorized") ? "bg-red-50 text-red-700" : "bg-background text-text"}`}
          >
            {message}
          </p>
        )}
        {canUpdate && (
          <button
            type="submit"
            disabled={saving}
            className="button disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save chat settings"}
          </button>
        )}
      </form>
      <a
        href="/admin/chat"
        className="inline-block text-sm font-semibold text-primary hover:underline"
      >
        ← Chat Inbox
      </a>
    </main>
  );
}
