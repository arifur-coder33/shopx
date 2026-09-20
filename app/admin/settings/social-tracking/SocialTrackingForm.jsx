"use client";

import {
  revealSocialTrackingSecret,
  saveSocialTrackingConfiguration,
} from "@/backend/serverActions/socialTrackingAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Eye, EyeOff, KeyRound, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-brand border border-border bg-surface px-3 py-2.5 text-base text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

const providers = [
  {
    key: "facebook",
    title: "Facebook / Meta",
    description: "Browser Pixel and server-side Conversions API configuration.",
    icon: "",
    fields: [
      {
        key: "facebookPixelId",
        label: "Facebook Pixel ID",
        env: "Browser Pixel + server CAPI",
      },
      {
        key: "facebookAccessToken",
        label: "Conversions API access token",
        env: "FB_ACCESS_TOKEN",
        secret: true,
      },
      {
        key: "facebookTestEventCode",
        label: "Test event code",
        env: "FB_TEST_EVENT_CODE",
        secret: true,
        optional: true,
      },
    ],
  },
  {
    key: "google",
    title: "Google",
    description:
      "Google Tag Manager, GA4 browser tracking and Measurement Protocol.",
    fields: [
      {
        key: "googleTagId",
        label: "Google Tag Manager ID",
        env: "NEXT_PUBLIC_GOOGLE_TAG_ID",
        optional: true,
      },
      {
        key: "googleAnalyticsId",
        label: "GA4 measurement ID",
        env: "NEXT_PUBLIC_GOOGLE_ANALYTICS_ID",
      },
      {
        key: "googleAnalyticsSecret",
        label: "GA4 API secret",
        env: "GOOGLE_ANALYTICS_SECRET",
        secret: true,
      },
    ],
  },
  {
    key: "tiktok",
    title: "TikTok",
    description: "TikTok browser Pixel and Events API configuration.",
    fields: [
      {
        key: "tiktokPixelId",
        label: "TikTok Pixel ID",
        env: "NEXT_PUBLIC_TIKTOK_PIXEL_ID",
      },
      {
        key: "tiktokAccessToken",
        label: "Events API access token",
        env: "TT_ACCESS_TOKEN",
        secret: true,
      },
    ],
  },
];

function SecretField({ field, configured, disabled, value, setValue }) {
  const [visible, setVisible] = useState(false);
  const [clearValue, setClearValue] = useState(false);
  const [revealing, startReveal] = useTransition();

  const toggleVisibility = () => {
    if (visible) {
      setVisible(false);
      return;
    }
    if (value || !configured) {
      setVisible(true);
      return;
    }
    startReveal(async () => {
      const result = await revealSocialTrackingSecret(field.key);
      if (!result.success) return toast.error(result.message);
      setValue(result.data.value);
      setVisible(true);
    });
  };

  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-text">
        {field.label}
        {field.optional && (
          <span className="ml-1 font-normal text-text-muted">(optional)</span>
        )}
      </label>
      <div className="relative">
        <input
          className={`${inputClass} pr-12`}
          name={field.key}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setClearValue(false);
          }}
          disabled={disabled || clearValue}
          autoComplete="new-password"
          placeholder={
            configured
              ? "Saved — enter a new value to replace"
              : "Not configured"
          }
        />
        <button
          type="button"
          onClick={toggleVisibility}
          disabled={disabled || revealing || clearValue}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-muted transition hover:text-primary disabled:opacity-40"
          aria-label={visible ? `Hide ${field.label}` : `Show ${field.label}`}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <code className="text-xs text-text-muted">{field.env}</code>
        {configured && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-danger">
            <input
              type="checkbox"
              name={`clear_${field.key}`}
              value="true"
              checked={clearValue}
              onChange={(event) => {
                setClearValue(event.target.checked);
                if (event.target.checked) setValue("");
              }}
              disabled={disabled}
            />
            Remove saved value
          </label>
        )}
      </div>
    </div>
  );
}

export default function SocialTrackingForm({ initialSettings }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, startTransition] = useTransition();
  const [secretValues, setSecretValues] = useState({});
  const canUpdate = hasUIPermission(
    session?.user?.permissions || [],
    "socialTracking",
    "update",
  );
  const disabled = pending || status === "loading" || !canUpdate;

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveSocialTrackingConfiguration(formData);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      setSecretValues({});
      router.refresh();
    });
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
              Social tracking settings
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Manage storefront pixels and server conversion credentials from
              the database.
            </p>
          </div>
        </div>
        {!initialSettings.encryptionReady && (
          <p className="mt-4 rounded-brand border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            Set PROVIDER_CREDENTIAL_ENCRYPTION_KEY (minimum 32 characters) on
            the server before saving secrets.
          </p>
        )}
      </header>

      <form onSubmit={submit} className="space-y-4">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <section
              key={provider.key}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6"
            >
              <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
                {Icon && <Icon size={22} className="text-primary" />}
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {provider.title}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {provider.description}
                  </p>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {provider.fields.map((field) =>
                  field.secret ? (
                    <SecretField
                      key={field.key}
                      field={field}
                      configured={initialSettings.configuredSecrets[field.key]}
                      disabled={disabled || !initialSettings.encryptionReady}
                      value={secretValues[field.key] || ""}
                      setValue={(value) =>
                        setSecretValues((current) => ({
                          ...current,
                          [field.key]: value,
                        }))
                      }
                    />
                  ) : (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-sm font-semibold text-text">
                        {field.label}
                        {field.optional && (
                          <span className="ml-1 font-normal text-text-muted">
                            (optional)
                          </span>
                        )}
                      </label>
                      <input
                        className={inputClass}
                        name={field.key}
                        defaultValue={initialSettings[field.key]}
                        disabled={disabled}
                        placeholder={`Enter ${field.label}`}
                      />
                    </div>
                  ),
                )}
              </div>
            </section>
          );
        })}

        <div className="sticky bottom-3 z-10 flex justify-end rounded-2xl border border-border bg-surface/95 p-3 shadow-lg backdrop-blur">
          <button
            type="submit"
            disabled={disabled}
            className="button flex items-center gap-2 bg-primary text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={17} /> {pending ? "Saving…" : "Save settings"}
          </button>
        </div>
        {!canUpdate && status !== "loading" && (
          <p className="text-right text-sm text-danger">
            You do not have permission to update these settings.
          </p>
        )}
      </form>
    </main>
  );
}
