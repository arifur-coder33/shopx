"use client";

import { updateContentPage } from "@/backend/serverActions/contentPageAction";
import CustomEditor from "@/components/input/quillEditor/CustomEditor";
import FileInput from "@/components/input/FileInput";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { ExternalLink, FileText, Save } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass =
  "w-full rounded-brand border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50";

export default function ContentPagesManager({ initialPages }) {
  const { data: session, status } = useSession();
  const [pages, setPages] = useState(initialPages);
  const [activeSlug, setActiveSlug] = useState(initialPages[0]?.slug);
  const [pending, startTransition] = useTransition();
  const activePage = pages.find((page) => page.slug === activeSlug);
  const canUpdate = hasUIPermission(
    session?.user?.permissions || [],
    "contentPage",
    "update",
  );
  const disabled = pending || status === "loading" || !canUpdate;

  if (!activePage) return <div className="card">No managed content pages found.</div>;

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await updateContentPage(formData);
      if (!response.success) return toast.error(response.message);
      setPages((current) =>
        current.map((page) =>
          page.slug === activeSlug
            ? {
                ...page,
                title: String(formData.get("title") || ""),
                content: String(formData.get("content") || ""),
                isPublished: formData.get("isPublished") === "true",
                ...(activeSlug === "footer" && { footerLogo: response.data?.footerLogo || null }),
                ...(activeSlug === "contact" && {
                  contactDetails: {
                    facebookPage: String(formData.get("facebookPage") || ""),
                    instagram: String(formData.get("instagram") || ""),
                    tiktok: String(formData.get("tiktok") || ""),
                    messenger: String(formData.get("messenger") || ""),
                    whatsappNumber: String(formData.get("whatsappNumber") || ""),
                    phoneNumber: String(formData.get("phoneNumber") || ""),
                    email: String(formData.get("email") || ""),
                  },
                }),
                updatedAt: new Date().toISOString(),
              }
            : page,
        ),
      );
      toast.success(response.message);
    });
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <header className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary-soft p-2.5 text-primary"><FileText size={23} /></span>
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Content pages</h1>
            <p className="mt-1 text-sm text-text-muted">Edit public contact, return, privacy, terms and user data deletion information without changing code.</p>
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Content page selection">
        {pages.map((page) => (
          <button
            key={page.slug}
            type="button"
            onClick={() => setActiveSlug(page.slug)}
            className={`min-h-12 rounded-xl px-3 py-2 text-left transition ${page.slug === activeSlug ? "bg-primary text-white shadow-sm" : "hover:bg-surface-muted"}`}
          >
            <strong className="block">{page.label}</strong>
            <small className={page.slug === activeSlug ? "text-white/75" : "text-text-muted"}>{page.slug === "footer" ? "Shown on every page" : page.path} · {page.isPublished ? "Published" : "Hidden"}</small>
          </button>
        ))}
      </nav>

      <form key={activePage.slug} onSubmit={submit} className="space-y-5">
        <input type="hidden" name="slug" value={activePage.slug} />
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-lg font-bold">Edit {activePage.label}</h2>
              <p className="text-sm text-text-muted">Public URL: {activePage.path}</p>
            </div>
            <Link href={activePage.path} target="_blank" className="flex min-h-10 items-center gap-2 rounded-brand border border-border px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-soft">
              View page <ExternalLink size={15} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
              {activeSlug === "footer" ? "Footer heading (optional; defaults to site name)" : "Page title"}
              <input name="title" defaultValue={activePage.title} maxLength={120} required={activeSlug !== "footer"} disabled={disabled} className={inputClass} />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Publish status
              <select name="isPublished" defaultValue={activePage.isPublished ? "true" : "false"} disabled={disabled} className={inputClass}>
                <option value="true">Published</option>
                <option value="false">Hidden / draft</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-semibold">
              Last updated
              <span className={`${inputClass} flex items-center text-text-muted`}>{activePage.updatedAt ? new Date(activePage.updatedAt).toLocaleString("en-BD", { timeZone: "Asia/Dhaka" }) : "Not saved yet"}</span>
            </label>
          </div>

          <div className="mt-5">
            {activeSlug === "footer" ? (
              <div className="space-y-3">
                <p className="text-xs text-text-muted">Choose a separate footer logo below, or leave it empty to use the header site logo automatically.</p>
                <FileInput name="footerLogo" label="Footer logo" recommendedSize="500 × 500 px recommended" defaultValue={activePage.footerLogo ? [activePage.footerLogo] : []} w={128} h={128} />
                <label className="grid gap-1.5 text-sm font-semibold">
                  Footer description
                  <textarea name="content" defaultValue={activePage.content} maxLength={2000} rows={5} disabled={disabled} className={inputClass} placeholder="Write the short description shown under the shop name in the footer." />
                </label>
              </div>
            ) : <CustomEditor name="content" label="Page content" defaultValue={activePage.content} readOnly={disabled} />}
          </div>
        </section>

        {activeSlug === "contact" && (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">Contact information</h2>
            <p className="mb-4 text-sm text-text-muted">These details appear on both the Contact page and the website footer.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                Facebook page URL
                <input type="url" name="facebookPage" defaultValue={activePage.contactDetails?.facebookPage || ""} placeholder="https://facebook.com/your-page" disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Instagram profile URL
                <input type="url" name="instagram" defaultValue={activePage.contactDetails?.instagram || ""} placeholder="https://instagram.com/your-shop" disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                TikTok profile URL
                <input type="url" name="tiktok" defaultValue={activePage.contactDetails?.tiktok || ""} placeholder="https://tiktok.com/@your-shop" disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Messenger URL
                <input type="url" name="messenger" defaultValue={activePage.contactDetails?.messenger || ""} placeholder="https://m.me/your-page" disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                WhatsApp number
                <input type="tel" name="whatsappNumber" defaultValue={activePage.contactDetails?.whatsappNumber || ""} placeholder="+8801XXXXXXXXX" maxLength={80} disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                Phone number
                <input type="tel" name="phoneNumber" defaultValue={activePage.contactDetails?.phoneNumber || ""} placeholder="+8801XXXXXXXXX" maxLength={80} disabled={disabled} className={inputClass} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">
                Email address
                <input type="email" name="email" defaultValue={activePage.contactDetails?.email || ""} placeholder="support@example.com" maxLength={160} disabled={disabled} className={inputClass} />
              </label>
            </div>
          </section>
        )}

        <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur">
          <p className="hidden text-sm text-text-muted sm:block">Published changes appear immediately.</p>
          <button type="submit" disabled={disabled} className="button ml-auto"><Save size={17} />{pending ? "Saving…" : `Save ${activePage.label}`}</button>
        </div>
        {!canUpdate && status !== "loading" && <p className="text-right text-sm text-danger">You do not have permission to update content pages.</p>}
      </form>
    </main>
  );
}
