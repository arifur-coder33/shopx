"use client";

import { createHeroSlide, deleteHeroSlide, updateHeroSlide } from "@/backend/serverActions/bannerAction";
import FileInput from "@/components/input/FileInput";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { cloudinaryMainImage } from "@/utils/cloudinaryUrl";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

const inputClass = "w-full rounded-xl border border-border bg-surface px-3 py-2 outline-none focus:border-primary";

export default function HeroSliderManager({ result }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [editing, setEditing] = useState(null);
  const [pending, startTransition] = useTransition();
  const permissions = session?.user?.permissions || [];
  const canCreate = hasUIPermission(permissions, "media", "create");
  const canUpdate = hasUIPermission(permissions, "media", "update");
  const canDelete = hasUIPermission(permissions, "media", "delete");

  if (!result.success) return <main className="p-4"><div className="card text-danger">{result.message}</div></main>;

  const submit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const response = editing?.id ? await updateHeroSlide(formData) : await createHeroSlide(formData);
      if (!response.success) return toast.error(response.message);
      toast.success(response.message);
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (slide) => {
    if (!window.confirm(`Delete slider image “${slide.title || "Untitled"}”?`)) return;
    startTransition(async () => {
      const response = await deleteHeroSlide(slide.id);
      if (!response.success) return toast.error(response.message);
      toast.success(response.message);
      router.refresh();
    });
  };

  return (
    <main className="space-y-5 p-3 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Home Slider</h1><p className="text-sm text-text-muted">Add responsive slider images and optional destination links. Lower order appears first.</p></div>
        <button type="button" disabled={!canCreate} onClick={() => setEditing({ isActive: true, sortOrder: result.data.length, motion: "FADE" })} className="button disabled:opacity-40"><Plus className="h-4 w-4" /> Add slide</button>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {result.data.map((slide) => (
          <article key={slide.id} className="overflow-hidden rounded-xl border border-border bg-surface">
            <img src={cloudinaryMainImage(slide.image.name, 640)} width="640" height="250" loading="lazy" decoding="async" alt={slide.title || "Slider image"} className="aspect-[1280/500] w-full object-cover" />
            <div className="flex items-start justify-between gap-3 p-3">
              <div className="min-w-0"><h2 className="truncate font-bold">{slide.title || "Untitled slide"}</h2><p className="truncate text-sm text-text-muted">{slide.link || "No link"}</p><p className="mt-1 text-xs">Order: {slide.sortOrder} · {(slide.motion || "FADE").replaceAll("_", " ")} · <span className={slide.isActive ? "text-success" : "text-danger"}>{slide.isActive ? "ACTIVE" : "DISABLED"}</span></p></div>
              <div className="flex shrink-0 gap-2"><button type="button" disabled={pending || !canUpdate} onClick={() => setEditing(slide)} aria-label="Edit slide" className="rounded-lg border border-border p-2 text-primary hover:bg-primary-soft disabled:opacity-40"><Pencil className="h-4 w-4" /></button><button type="button" disabled={pending || !canDelete} onClick={() => remove(slide)} aria-label="Delete slide" className="rounded-lg border border-danger/30 p-2 text-danger hover:bg-danger/10 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </article>
        ))}
      </section>
      {!result.data.length && <div className="card py-12 text-center text-text-muted">No slider image yet. Add the first slide.</div>}

      {editing !== null && (
        <div className="fixed inset-0 z-50 grid overflow-y-auto bg-black/55 p-3 sm:place-items-center" role="dialog" aria-modal="true" aria-label="Slider editor">
          <form onSubmit={submit} className="my-auto w-full max-w-2xl space-y-4 rounded-2xl bg-surface p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{editing.id ? "Edit slide" : "Add slide"}</h2><button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-border px-3 py-2">Close</button></div>
            {editing.id && <input type="hidden" name="id" value={editing.id} />}
            <FileInput name="image" label="Slider image" defaultValue={editing.image} w={320} h={125} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold">Title<input name="title" defaultValue={editing.title || ""} className={inputClass} placeholder="Optional image description" /></label>
              <label className="grid gap-1 text-sm font-semibold">Link<input name="link" defaultValue={editing.link || ""} className={inputClass} placeholder="/product/example or https://..." /></label>
              <label className="grid gap-1 text-sm font-semibold">Order<input name="sortOrder" type="number" step="1" defaultValue={editing.sortOrder ?? 0} className={inputClass} /></label>
              <label className="grid gap-1 text-sm font-semibold">Status<select name="isActive" defaultValue={editing.isActive === false ? "false" : "true"} className={inputClass}><option value="true">Active</option><option value="false">Disabled</option></select></label>
              <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Slider motion<select name="motion" defaultValue={editing.motion || "FADE"} className={inputClass}><option value="FADE">Fade</option><option value="ZOOM">Zoom</option><option value="SLIDE_LEFT">Slide right to left</option><option value="SLIDE_RIGHT">Slide left to right</option></select></label>
            </div>
            <button disabled={pending} className="button w-full">{pending ? "Saving…" : "Save slide"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
