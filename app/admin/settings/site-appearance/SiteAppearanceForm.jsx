"use client";

import { updateSiteAppearance } from "@/backend/serverActions/siteSettingAction";
import FileInput from "@/components/input/FileInput";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { Globe2, Palette, Save, Type } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const colorFields = [
  { key: "primaryColor", label: "Primary", note: "Buttons, links and active states" },
  { key: "secondaryColor", label: "Secondary", note: "Supporting brand color" },
  { key: "accentColor", label: "Accent", note: "Highlights and accents" },
  { key: "lightBackground", label: "Light background", note: "Page background in light mode" },
  { key: "lightSurface", label: "Light surface", note: "Cards, menus and inputs" },
  { key: "lightText", label: "Light text", note: "Main text in light mode" },
  { key: "darkBackground", label: "Dark background", note: "Page background in dark mode" },
  { key: "darkSurface", label: "Dark surface", note: "Cards, menus and inputs" },
  { key: "darkText", label: "Dark text", note: "Main text in dark mode" },
];

const inputClass =
  "w-full rounded-brand border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50";

function ColorField({ field, value, onChange, disabled }) {
  return (
    <label className="grid min-w-0 grid-cols-[3rem_1fr] gap-x-3 gap-y-1 rounded-xl border border-border p-3">
      <input
        type="color"
        name={`${field.key}Picker`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="row-span-2 h-12 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        aria-label={`${field.label} color picker`}
      />
      <span className="font-semibold text-text">{field.label}</span>
      <span className="text-xs text-text-muted">{field.note}</span>
      <input
        name={field.key}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        pattern="#[0-9a-fA-F]{6}"
        maxLength={7}
        className={`${inputClass} col-span-2 mt-2 font-mono uppercase`}
        aria-label={`${field.label} hex value`}
      />
    </label>
  );
}

export default function SiteAppearanceForm({ initialSettings }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(initialSettings);
  const canUpdate = hasUIPermission(
    session?.user?.permissions || [],
    "siteSetting",
    "update",
  );
  const disabled = pending || status === "loading" || !canUpdate;
  const updateValue = (key, value) =>
    setSettings((current) => ({ ...current, [key]: value }));

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await updateSiteAppearance(formData);
      if (!response.success) return toast.error(response.message);
      toast.success(response.message);
      router.refresh();
    });
  };

  const previewStyle = {
    background: settings.lightBackground,
    color: settings.lightText,
    borderRadius: `${settings.borderRadius}px`,
    fontSize: `${settings.baseFontSize}px`,
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <header className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-primary"><Palette size={23} /></span>
          <div>
            <h1 className="text-xl font-bold text-text sm:text-2xl">Site appearance</h1>
            <p className="mt-1 text-sm text-text-muted">Update the site name, favicon, logo, brand colors, theme and global font size.</p>
          </div>
        </div>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="text-primary" size={21} />
            <div>
              <h2 className="text-lg font-bold">Site identity</h2>
              <p className="text-sm text-text-muted">The site name appears in browser titles and the footer. Select images through the current Media uploader.</p>
            </div>
          </div>
          <label className="mb-5 grid gap-1.5 text-sm font-semibold">
            Site name
            <input name="siteName" value={settings.name} onChange={(event) => updateValue("name", event.target.value)} maxLength={80} required disabled={disabled} className={inputClass} placeholder="Your shop name" />
          </label>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">
              SEO title
              <input name="seoTitle" value={settings.seoTitle || ""} onChange={(event) => updateValue("seoTitle", event.target.value)} maxLength={160} disabled={disabled} className={inputClass} placeholder={settings.name || "Your shop name"} />
              <span className="text-xs font-normal text-text-muted">Used as the homepage and default browser title. Empty uses the site name.</span>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              SEO description
              <textarea name="seoDescription" value={settings.seoDescription || ""} onChange={(event) => updateValue("seoDescription", event.target.value)} maxLength={320} rows={3} disabled={disabled} className={inputClass} placeholder="Describe your store for search engines" />
              <span className="text-xs font-normal text-text-muted">Used by search engines and social sharing previews.</span>
            </label>
          </div>
          <h3 className="mb-2 font-bold">Site logo</h3>
          {!initialSettings.logoMedia && initialSettings.logo && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-muted p-3">
              <img src={cloudinaryMainImage(initialSettings.logo, 128)} width="64" height="64" alt="Current site logo" className="h-16 w-16 rounded-lg object-contain" />
              <span className="text-sm text-text-muted">Current legacy logo. Selecting a new logo will replace it.</span>
            </div>
          )}
          <FileInput name="logo" label="Logo image" recommendedSize="500 × 500 px recommended" defaultValue={initialSettings.logoMedia} w={128} h={128} />
          {initialSettings.logo && (
            <label className="mt-3 flex items-center gap-2 text-sm text-danger">
              <input type="checkbox" name="removeLogo" value="true" disabled={disabled} /> Remove current logo
            </label>
          )}
          <div className="my-5 border-t border-border" />
          <h3 className="mb-1 font-bold">Favicon</h3>
          <p className="mb-3 text-sm text-text-muted">Use a square PNG, JPG or WebP image. Recommended size: 64×64 pixels or larger.</p>
          <FileInput name="favicon" label="Favicon image" recommendedSize="64 × 64 px or larger" defaultValue={initialSettings.faviconMedia} w={64} h={64} />
          {initialSettings.favicon && (
            <label className="mt-3 flex items-center gap-2 text-sm text-danger">
              <input type="checkbox" name="removeFavicon" value="true" disabled={disabled} /> Remove current favicon
            </label>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">Theme colors</h2>
          <p className="mb-4 text-sm text-text-muted">Muted, border, hover and soft colors are generated automatically for consistent contrast.</p>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {colorFields.map((field) => (
              <ColorField key={field.key} field={field} value={settings[field.key]} onChange={(value) => updateValue(field.key, value)} disabled={disabled} />
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-2"><Type className="text-primary" size={21} /><h2 className="text-lg font-bold">Size and shape</h2></div>
            <label className="block">
              <span className="flex justify-between font-semibold"><span>Base font size</span><strong className="text-primary">{settings.baseFontSize}px</strong></span>
              <input type="range" name="baseFontSize" min="14" max="20" step="1" value={settings.baseFontSize} onChange={(event) => updateValue("baseFontSize", event.target.value)} disabled={disabled} className="mt-3 w-full accent-[var(--brand-primary)]" />
              <span className="mt-1 flex justify-between text-xs text-text-muted"><span>Compact</span><span>Large</span></span>
            </label>
            <label className="mt-6 block">
              <span className="flex justify-between font-semibold"><span>Corner radius</span><strong className="text-primary">{settings.borderRadius}px</strong></span>
              <input type="range" name="borderRadius" min="0" max="24" step="1" value={settings.borderRadius} onChange={(event) => updateValue("borderRadius", event.target.value)} disabled={disabled} className="mt-3 w-full accent-[var(--brand-primary)]" />
              <span className="mt-1 flex justify-between text-xs text-text-muted"><span>Square</span><span>Rounded</span></span>
            </label>
          </div>

          <div className="overflow-hidden border border-border p-4 shadow-sm" style={previewStyle}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: settings.accentColor }}>Live preview</p>
            <h2 className="mt-2 text-xl font-bold">{settings.name || "Your storefront"}</h2>
            <p className="mt-1 opacity-70">Colors, typography and corner shape update together across the site.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="px-4 py-2 font-bold text-white" style={{ background: settings.primaryColor, borderRadius: `${settings.borderRadius}px` }}>Primary button</span>
              <span className="px-4 py-2 font-bold text-white" style={{ background: settings.secondaryColor, borderRadius: `${settings.borderRadius}px` }}>Secondary</span>
            </div>
            <div className="mt-4 border p-3" style={{ background: settings.lightSurface, borderRadius: `${settings.borderRadius}px`, borderColor: `${settings.lightText}25` }}>Product card preview</div>
          </div>
        </section>

        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur">
          <p className="hidden text-sm text-text-muted sm:block">Changes apply site-wide after saving.</p>
          <button type="submit" disabled={disabled} className="button ml-auto"><Save size={17} />{pending ? "Saving…" : "Save appearance"}</button>
        </div>
        {!canUpdate && status !== "loading" && <p className="text-right text-sm text-danger">You do not have permission to update site appearance.</p>}
      </form>
    </main>
  );
}
