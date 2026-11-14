"use client";

import {
  generateProductFeedCredentials,
  revealSocialTrackingSecret,
  saveSocialTrackingConfiguration,
} from "@/backend/serverActions/socialTrackingAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw, Save } from "lucide-react";
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
        env: "Saved code enables Meta Test Events for new Purchase events. Remove it after testing.",
        secret: true,
        optional: true,
      },
    ],
  },
  {
    key: "google",
    title: "Google",
    description:
      "GA4 browser tracking and reporting. For reports, enable the Analytics Data API and grant the saved service account Viewer access to your GA4 property.",
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
        key: "googleAnalyticsPropertyId",
        label: "GA4 property ID",
        env: "Used by server-side Analytics Data API reports",
      },
      {
        key: "googleAnalyticsSecret",
        label: "GA4 API secret",
        env: "GOOGLE_ANALYTICS_SECRET",
        secret: true,
      },
      {
        key: "googleAnalyticsServiceAccountJson",
        label: "GA4 reporting service account JSON key",
        env: "Encrypted at rest; grant this service account Viewer access to the GA4 property",
        secret: true,
        multiline: true,
        optional: true,
      },
    ],
  },
  {
    key: "clarity",
    title: "Microsoft Clarity",
    description: "Session recordings and click/scroll heatmaps for visitor behavior.",
    fields: [
      {
        key: "clarityProjectId",
        label: "Clarity project ID",
        env: "Loaded asynchronously after the page is idle",
      },
      {
        key: "clarityApiToken",
        label: "Clarity Data Export API token",
        env: "Encrypted at rest; used by the admin Clarity insights report",
        secret: true,
        optional: true,
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

function CopyableUrl({ id, label, url, hint }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-5 rounded-xl border border-border bg-surface-muted p-4">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-text">{label}</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id={id} className={inputClass} value={url} readOnly onFocus={(event) => event.target.select()} />
        <button type="button" className="button inline-flex shrink-0 items-center justify-center gap-2" onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          } catch {
            toast.error(`Could not copy the URL. Select and copy it manually.`);
          }
        }}>
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? "Copied" : "Copy URL"}
        </button>
      </div>
      {hint && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

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
        {field.multiline && visible ? (
          <textarea
            className={`${inputClass} min-h-32 resize-y pr-12 font-mono text-xs`}
            name={field.key}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setClearValue(false);
            }}
            disabled={disabled || clearValue}
            autoComplete="new-password"
            placeholder={configured ? "Saved — enter a new JSON key to replace" : "Paste service account JSON key"}
          />
        ) : (
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
            placeholder={configured ? "Saved — enter a new value to replace" : "Not configured"}
          />
        )}
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

export default function SocialTrackingForm({ initialSettings, sitemapUrl, productFeedUrls }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, startTransition] = useTransition();
  const [secretValues, setSecretValues] = useState({});
  const [feedUsername, setFeedUsername] = useState(initialSettings.productFeedUsername || "");
  const [feedPassword, setFeedPassword] = useState("");
  const [generatedFeedCredentials, setGeneratedFeedCredentials] = useState(null);
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

  const generateFeedCredentials = () => startTransition(async () => {
    const result = await generateProductFeedCredentials();
    if (!result.success) return toast.error(result.message);
    setFeedUsername(result.data.username);
    setFeedPassword(result.data.password);
    setGeneratedFeedCredentials(result.data);
    toast.success(result.message);
    router.refresh();
  });

  const copyFeedCredentials = async () => {
    if (!generatedFeedCredentials) return;
    try {
      await navigator.clipboard.writeText(`Username: ${generatedFeedCredentials.username}\nPassword: ${generatedFeedCredentials.password}`);
      toast.success("Feed login কপি হয়েছে।");
    } catch {
      toast.error("কপি করা যায়নি; credentials manually কপি করুন।");
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
                      <code className="mt-1.5 block text-xs text-text-muted">
                        {field.env}
                      </code>
                    </div>
                  ),
                )}
              </div>
              {provider.key === "facebook" && <div>
                <label htmlFor="facebookDomainVerification" className="mb-1.5 block text-sm font-semibold text-text">Facebook Business domain verification code</label>
                <input id="facebookDomainVerification" name="facebookDomainVerification" defaultValue={initialSettings.facebookDomainVerification || ""} maxLength={200} disabled={disabled} className={inputClass} placeholder="শুধু content-এর ভেতরের code দিন" />
                <p className="mt-1.5 text-xs text-text-muted">Meta Business Settings → Brand safety → Domains → Add a meta-tag থেকে শুধু content="..."-এর ভেতরের code কপি করুন; পুরো &lt;meta&gt; tag দেবেন না।</p>
              </div>}
              {provider.key === "google" && <>
                <div>
                  <label htmlFor="googleSiteVerification" className="mb-1.5 block text-sm font-semibold text-text">Google Search Console verification code</label>
                  <input id="googleSiteVerification" name="googleSiteVerification" defaultValue={initialSettings.googleSiteVerification || ""} maxLength={200} disabled={disabled} className={inputClass} placeholder="শুধু content-এর ভেতরের code দিন" />
                  <p className="mt-1.5 text-xs text-text-muted">Search Console → Settings → Ownership verification → HTML tag থেকে শুধু content="..."-এর ভেতরের code কপি করুন; পুরো &lt;meta&gt; tag দেবেন না।</p>
                </div>
                <CopyableUrl id="google-sitemap-url" label="Google Search Console sitemap URL" url={sitemapUrl} hint="Submit this URL in Google Search Console → Sitemaps." />
                <CopyableUrl id="google-product-feed-url" label="Google Merchant Center product feed (XML)" url={productFeedUrls.google} hint="Add this URL as a scheduled fetch data source in Merchant Center." />
              </>}
              {provider.key === "facebook" && <CopyableUrl id="facebook-product-feed-url" label="Facebook / Meta Catalog product feed (CSV)" url={productFeedUrls.facebook} hint="Add this URL in Meta Commerce Manager → Catalog → Data sources." />}
              {provider.key === "tiktok" && <CopyableUrl id="tiktok-product-feed-url" label="TikTok product feed (CSV)" url={productFeedUrls.tiktok} hint="Add this URL as a scheduled feed in TikTok Seller Center / Catalog." />}
            </section>
          );
        })}

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="text-lg font-bold text-text">Product feed login</h2><p className="mt-1 text-sm text-text-muted">সব product feed URL Basic Auth দিয়ে সুরক্ষিত। Meta Commerce Manager-এর Login details-এ এখানকার username ও password দিন।</p><p className={`mt-2 text-sm font-semibold ${initialSettings.productFeedCredentialsConfigured ? "text-emerald-700" : "text-amber-700"}`}>{initialSettings.productFeedCredentialsConfigured ? "Feed protection active" : "Login এখনো তৈরি হয়নি; feed access 401 দিয়ে বন্ধ থাকবে"}</p></div>
            <button type="button" onClick={generateFeedCredentials} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl border border-primary px-3 py-2 text-sm font-semibold text-primary disabled:opacity-50"><RefreshCw className="h-4 w-4" /> Generate login</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">Username<input name="productFeedUsername" value={feedUsername} onChange={(event) => setFeedUsername(event.target.value)} maxLength={64} autoComplete="off" disabled={disabled} className={inputClass} placeholder="Feed username" /></label>
            <label className="grid gap-1.5 text-sm font-semibold">Password<input name="productFeedPassword" type="password" value={feedPassword} onChange={(event) => { setFeedPassword(event.target.value); setGeneratedFeedCredentials(null); }} maxLength={128} autoComplete="new-password" disabled={disabled} className={inputClass} placeholder={initialSettings.productFeedCredentialsConfigured ? "Configured — leave blank to keep, or enter a new password" : "Set a password (12+ characters)"} /></label>
          </div>
          <p className="mt-2 text-xs text-text-muted">Password database-এ hash আকারে রাখা হয়, আগের password দেখা যাবে না। Generate login করলে পুরোনো credentials তাৎক্ষণিকভাবে বাতিল হবে।</p>
          {generatedFeedCredentials && <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950"><div className="flex flex-wrap items-center justify-between gap-2"><strong>নতুন login তৈরি হয়েছে — এখনই কপি করুন</strong><button type="button" onClick={copyFeedCredentials} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-semibold"><Copy className="h-3.5 w-3.5" /> Copy credentials</button></div><p className="mt-2 break-all">Username: <code>{generatedFeedCredentials.username}</code></p><p className="break-all">Password: <code>{generatedFeedCredentials.password}</code></p></div>}
          <div className="mt-4 grid gap-2 text-xs text-text-muted sm:grid-cols-3"><code className="break-all">{productFeedUrls.facebook}</code><code className="break-all">{productFeedUrls.google}</code><code className="break-all">{productFeedUrls.tiktok}</code></div>
        </section>

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
