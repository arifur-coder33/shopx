"use client";

import { updateContentPageSeo, updateGlobalSeoSettings } from "@/backend/serverActions/seoAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Globe, Save, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50";

function GooglePreview({ url, title, description }) {
  return (
    <div className="rounded-xl border border-border bg-white p-4 text-left shadow-sm sm:p-5">
      <p className="text-xs font-semibold text-slate-500">Google result preview · approximate</p>
      <p className="mt-2 truncate text-sm text-slate-700">{url}</p>
      <h3 className="mt-1 line-clamp-2 text-xl leading-7 text-[#1a0dab]">{title || "Your page title"}</h3>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#4d5156]">{description || "A useful summary of this page may appear here."}</p>
      <p className="mt-2 text-xs text-slate-500">Google may choose a different title or snippet for a search.</p>
    </div>
  );
}

export default function SeoManager({ initialData, siteUrl }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialData);
  const canUpdate = hasUIPermission(session?.user?.permissions || [], "seoSettings", "update");
  const disabled = pending || status === "loading" || !canUpdate;
  const origin = siteUrl.replace(/\/$/, "");
  const setSiteValue = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const setPageValue = (slug, key, value) => setSettings((current) => ({
    ...current,
    pages: current.pages.map((page) => page.slug === slug ? { ...page, [key]: value } : page),
  }));

  const saveGlobal = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateGlobalSeoSettings(formData);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      router.refresh();
    });
  };

  const savePage = (event, slug) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("slug", slug);
    startTransition(async () => {
      const result = await updateContentPageSeo(formData);
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      router.refresh();
    });
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <header className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-primary"><Globe size={23} /></span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Site SEO</h1>
            <p className="mt-1 text-sm text-text-muted">Global search metadata, Search Console verification, and SEO fields for content pages.</p>
          </div>
        </div>
      </header>

      <form onSubmit={saveGlobal} className="space-y-5 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div>
          <h2 className="text-lg font-bold">Global site SEO</h2>
          <p className="text-sm text-text-muted">This applies to the homepage and pages without their own SEO title or description.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">
            Site SEO title
            <input name="seoTitle" value={settings.seoTitle} onChange={(event) => setSiteValue("seoTitle", event.target.value)} maxLength={160} disabled={disabled} className={inputClass} placeholder={settings.siteName || "Your shop name"} />
            <span className="text-xs font-normal text-text-muted">Up to 160 characters. Leave blank to use the shop name.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Site SEO description
            <textarea name="seoDescription" value={settings.seoDescription} onChange={(event) => setSiteValue("seoDescription", event.target.value)} maxLength={320} rows={3} disabled={disabled} className={inputClass} placeholder="A concise description of your shop" />
            <span className="text-xs font-normal text-text-muted">Up to 320 characters. Search engines may use page text instead.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
            SEO keywords (comma separated)
            <textarea name="seoKeywords" value={settings.seoKeywords} onChange={(event) => setSiteValue("seoKeywords", event.target.value)} maxLength={500} rows={2} disabled={disabled} className={inputClass} placeholder="online shop, clothing, fashion" />
            <span className="text-xs font-normal text-text-muted">Google ignores the meta-keywords tag for ranking. Use relevant phrases naturally in your page content.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
            Google Search Console verification code
            <input name="googleSiteVerification" value={settings.googleSiteVerification} onChange={(event) => setSiteValue("googleSiteVerification", event.target.value)} maxLength={200} disabled={disabled} className={inputClass} placeholder="Paste the content value from Google’s HTML verification tag" />
            <span className="text-xs font-normal text-text-muted">Search Console → Settings → Ownership verification → HTML tag.</span>
          </label>
        </div>
        <GooglePreview url={`${origin}/`} title={settings.seoTitle.trim() || settings.siteName} description={settings.seoDescription.trim()} />
        <div className="flex justify-end">
          <button type="submit" disabled={disabled} className="button"><Save size={17} />{pending ? "Saving…" : "Save global SEO"}</button>
        </div>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold">Content page SEO</h2>
          <p className="text-sm text-text-muted">Set a page-specific search title and description. Blank fields use the page title or its content.</p>
        </div>
        {settings.pages.map((page) => (
          <form key={page.slug} onSubmit={(event) => savePage(event, page.slug)} className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h3 className="font-bold">{page.label}</h3><p className="text-sm text-text-muted">{origin}{page.path}</p></div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${page.isPublished ? "bg-success/10 text-success" : "bg-surface-muted text-text-muted"}`}>{page.exists ? page.isPublished ? "Published" : "Draft" : "Not created yet"}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">SEO title<input name="metaTitle" value={page.metaTitle} onChange={(event) => setPageValue(page.slug, "metaTitle", event.target.value)} maxLength={160} disabled={disabled || !page.exists} className={inputClass} placeholder={page.title} /></label>
              <label className="grid gap-1.5 text-sm font-semibold">SEO description<textarea name="metaDescription" value={page.metaDescription} onChange={(event) => setPageValue(page.slug, "metaDescription", event.target.value)} maxLength={320} rows={2} disabled={disabled || !page.exists} className={inputClass} placeholder="Optional page summary" /></label>
            </div>
            <GooglePreview url={`${origin}${page.path}`} title={page.metaTitle.trim() || page.title} description={page.metaDescription.trim()} />
            <div className="flex justify-end"><button type="submit" disabled={disabled || !page.exists} className="button"><Search size={16} />{pending ? "Saving…" : `Save ${page.label} SEO`}</button></div>
          </form>
        ))}
      </section>
      {!canUpdate && status !== "loading" && <p className="text-right text-sm text-danger">You do not have permission to update SEO settings.</p>}
    </main>
  );
}
