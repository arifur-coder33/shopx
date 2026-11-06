"use client";

import { saveSocialAuthProvider } from "@/backend/serverActions/socialAuthAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Check, Copy, KeyRound, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const providers = [
  {
    key: "google",
    name: "Google",
    description: "Google OAuth sign-in for customer accounts.",
  },
  {
    key: "facebook",
    name: "Facebook",
    description: "Facebook Login for customer accounts.",
  },
];
const inputClass =
  "w-full rounded-brand border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

export default function SocialLoginSettingsForm({
  initialSettings,
  encryptionReady,
  callbackUrls,
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pendingProvider, setPendingProvider] = useState("");
  const [pending, startTransition] = useTransition();
  const [copiedProvider, setCopiedProvider] = useState("");
  const canUpdate = hasUIPermission(
    session?.user?.permissions || [],
    "siteSetting",
    "update",
  );

  const submit = (event, provider) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("provider", provider);
    formData.set("isActive", formData.has("isActive") ? "true" : "false");
    setPendingProvider(provider);
    startTransition(async () => {
      const result = await saveSocialAuthProvider(formData);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
        form.reset();
        router.refresh();
      }
      setPendingProvider("");
    });
  };

  const disabled = pending || status === "loading" || !canUpdate;

  const copyCallbackUrl = async (provider) => {
    try {
      await navigator.clipboard.writeText(callbackUrls[provider]);
      setCopiedProvider(provider);
      window.setTimeout(() => setCopiedProvider(""), 1800);
    } catch {
      toast.error("Could not copy callback URL. Please copy it manually.");
    }
  };
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 pb-10">
      <header className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <KeyRound size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text sm:text-2xl">
              Social login settings
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Save OAuth credentials encrypted in the database and control which
              login buttons customers see.
            </p>
          </div>
        </div>
        {!encryptionReady && (
          <p className="mt-4 rounded-brand border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Set PROVIDER_CREDENTIAL_ENCRYPTION_KEY (minimum 32 characters) on
            the server before saving credentials.
          </p>
        )}
      </header>

      {providers.map((provider) => {
        const settings = initialSettings[provider.key];
        const isPending = pendingProvider === provider.key;
        return (
          <form
            key={provider.key}
            onSubmit={(event) => submit(event, provider.key)}
            className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
          >
            <input type="hidden" name="provider" value={provider.key} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                {provider.key === "facebook" ? (
                  <span className="text-primary font-bold"> F </span>
                ) : (
                  <span className="text-xl font-black text-primary">G</span>
                )}
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {provider.name}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {provider.description}
                  </p>
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-text">
                <input
                  type="checkbox"
                  name="isActive"
                  value="true"
                  defaultChecked={settings.isActive}
                  disabled={disabled}
                  className="h-4 w-4 accent-primary"
                />
                Active
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-text">
                Client ID
                <input
                  className={`${inputClass} mt-1.5`}
                  name="clientId"
                  defaultValue={settings.clientId}
                  autoComplete="off"
                  disabled={disabled || !encryptionReady}
                  placeholder="Enter OAuth Client ID / App ID"
                />
              </label>
              <label className="block text-sm font-semibold text-text">
                Client Secret
                <input
                  className={`${inputClass} mt-1.5`}
                  name="clientSecret"
                  type="password"
                  autoComplete="new-password"
                  disabled={disabled || !encryptionReady}
                  placeholder={
                    settings.clientSecretConfigured
                      ? "Saved — enter a new secret to replace"
                      : "Enter OAuth Client Secret / App Secret"
                  }
                />
              </label>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${provider.key}-callback-url`}
                className="block text-sm font-semibold text-text"
              >
                OAuth Callback URL
              </label>
              <div className="flex gap-2">
                <input
                  id={`${provider.key}-callback-url`}
                  className={`${inputClass} min-w-0`}
                  value={callbackUrls[provider.key]}
                  readOnly
                  onFocus={(event) => event.target.select()}
                />
                <button
                  type="button"
                  onClick={() => copyCallbackUrl(provider.key)}
                  className="button flex shrink-0 items-center gap-2"
                  aria-label={`Copy ${provider.name} callback URL`}
                  title={`Copy ${provider.name} callback URL`}
                >
                  {copiedProvider === provider.key ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                  <span>{copiedProvider === provider.key ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-xs text-text-muted">
                Paste this into {provider.name}&apos;s OAuth redirect URI settings.
              </p>
            </div>
            {settings.clientSecretConfigured && (
              <label className="flex items-center gap-2 text-sm text-danger">
                <input
                  type="checkbox"
                  name="clearCredentials"
                  value="true"
                  disabled={disabled}
                  className="h-4 w-4 accent-primary"
                />{" "}
                Remove saved credentials
              </label>
            )}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted">
                Credentials are encrypted at rest. Login button appears only
                when active and both values are valid.
              </p>
              <button
                type="submit"
                disabled={disabled || !encryptionReady}
                className="button flex shrink-0 items-center gap-2 bg-primary text-white disabled:opacity-50"
              >
                <Save size={16} />
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        );
      })}
      {!canUpdate && status !== "loading" && (
        <p className="text-right text-sm text-danger">
          You do not have permission to update these settings.
        </p>
      )}
    </main>
  );
}
