"use client";

import { deleteMediaAction } from "@/backend/serverActions/fileUploadAction";
import ModalButton from "@/components/modal/ModalButton";
import FileUploader from "@/components/input/FileUploader";
import ImageCustom from "@/components/images/ImageCustom";
import { cloudinaryOriginalImage } from "@/utils/cloudinaryUrl";
import { confirmFromUser } from "@/components/modal/confrim/confirm";
import { useRouter } from "next/navigation";
import { Copy, Image as ImageIcon, Search, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";

const formatBytes = (bytes) => {
  if (!Number.isFinite(Number(bytes))) return "Size unknown";
  return `${(Number(bytes) / (1024 * 1024)).toFixed(2)} MB`;
};

function MediaDetails({ item, canDelete, onDelete }) {
  const dimensions = item.width && item.height ? `${item.width} × ${item.height} px` : "Dimensions unavailable";
  const original = item.url || cloudinaryOriginalImage(item.name);
  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
      <a href={original} target="_blank" rel="noopener noreferrer" aria-label="Open full image" className="flex min-h-64 min-w-0 items-center justify-center rounded-xl bg-surface-muted p-3">
        <img src={original} alt={item.displayName || item.name} decoding="async" className="block h-auto max-h-[65dvh] w-auto max-w-full object-contain" />
      </a>
      <div className="space-y-4">
        <div>
          <h2 className="break-words text-xl font-bold">{item.displayName || item.name}</h2>
          <p className="mt-1 break-all text-xs text-text-muted">{item.name}</p>
          <p className="mt-2 text-sm text-text-muted">{dimensions} · {formatBytes(item.sizeBytes)}</p>
        </div>
        <section className="space-y-2">
          <h3 className="font-semibold">Used in {item.useCount} place{item.useCount === 1 ? "" : "s"}</h3>
          {item.usedIn?.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {item.usedIn.map((usage, index) => (
                <li key={`${usage.section}-${usage.title}-${index}`} className="rounded-lg border border-border p-3 text-sm">
                  <span className="block font-medium">{usage.section}</span>
                  {usage.href ? <a href={usage.href} className="text-primary hover:underline">{usage.title}</a> : <span className="text-text-muted">{usage.title}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="rounded-lg bg-success/10 p-3 text-sm text-success">This media is not currently used.</p>}
        </section>
        {canDelete && !item.useCount && <button type="button" onClick={() => onDelete(item)} className="button border-danger/30 text-danger hover:bg-danger/10"><Trash2 size={16} /> Delete media</button>}
      </div>
    </div>
  );
}

export default function MediaLibrary({ initialMedia = [], canUpload = false, canDelete = false }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const router = useRouter();
  const media = useMemo(() => {
    const term = query.trim().toLowerCase();
    return initialMedia.filter((item) => {
      const used = item.useCount > 0;
      if (filter === "used" && !used) return false;
      if (filter === "unused" && used) return false;
      return !term || `${item.displayName || ""} ${item.name}`.toLowerCase().includes(term);
    });
  }, [initialMedia, query, filter]);

  const handleDelete = async (item) => {
    const confirmed = await confirmFromUser({ title: "Delete media", message: `Delete “${item.displayName || item.name}”?` });
    if (!confirmed) return;
    const result = await deleteMediaAction(item.id);
    if (!result.success) {
      toast.error(result.error || "Media could not be deleted.");
      return;
    }
    toast.success(result.data || "Media deleted.");
    router.refresh();
  };

  const copyUrl = async (item) => {
    try {
      await navigator.clipboard.writeText(item.url || item.name);
      toast.success("Media URL copied.");
    } catch {
      toast.error("Could not copy media URL.");
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Media library</h1><p className="text-sm text-text-muted">Browse, search, and check where each image is used.</p></div>
        {canUpload && <ModalButton buttonName={<span className="button"><UploadCloud size={17} /> Upload media</span>}><FileUploader multiple onUpload={() => router.refresh()} /></ModalButton>}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4"><span className="text-sm text-text-muted">All media</span><p className="mt-1 text-2xl font-bold">{initialMedia.length}</p></div>
        <div className="rounded-xl border border-border bg-surface p-4"><span className="text-sm text-text-muted">In use</span><p className="mt-1 text-2xl font-bold">{initialMedia.filter((item) => item.useCount > 0).length}</p></div>
        <div className="rounded-xl border border-border bg-surface p-4"><span className="text-sm text-text-muted">Unused</span><p className="mt-1 text-2xl font-bold">{initialMedia.filter((item) => item.useCount === 0).length}</p></div>
      </section>

      <section className="flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-3">
        <label className="relative min-w-56 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by media name" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm" /></label>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="all">All media</option><option value="used">Used</option><option value="unused">Unused</option></select>
        <span className="self-center text-sm text-text-muted">{media.length} shown</span>
      </section>

      {media.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {media.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <ModalButton buttonName={<div className="group relative aspect-square cursor-pointer overflow-hidden bg-surface-muted"><ImageCustom src={item.name} alt={item.displayName || item.name} w={360} h={360} className="h-full w-full object-cover transition-transform group-hover:scale-105" /><span className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-1 text-xs font-semibold text-white">{item.useCount} use{item.useCount === 1 ? "" : "s"}</span></div>}>
              <MediaDetails item={item} canDelete={canDelete} onDelete={handleDelete} />
            </ModalButton>
            <div className="space-y-2 p-3">
              <ModalButton buttonName={<span className="block truncate text-left text-sm font-semibold" title={item.displayName || item.name}>{item.displayName || item.name}</span>}><MediaDetails item={item} canDelete={canDelete} onDelete={handleDelete} /></ModalButton>
              <p className="truncate text-xs text-text-muted">{item.width && item.height ? `${item.width} × ${item.height} px` : "Dimensions unavailable"} · {formatBytes(item.sizeBytes)}</p>
              <div className="flex items-center justify-between gap-2"><span className={item.useCount ? "text-xs font-medium text-success" : "text-xs text-text-muted"}>{item.useCount ? "In use" : "Unused"}</span><div className="flex gap-1"><button type="button" onClick={() => copyUrl(item)} className="rounded-md p-2 text-text-muted hover:bg-surface-muted" aria-label="Copy media URL" title="Copy media URL"><Copy size={15} /></button>{canDelete && !item.useCount && <button type="button" onClick={() => handleDelete(item)} className="rounded-md p-2 text-danger hover:bg-danger/10" aria-label="Delete media" title="Delete media"><Trash2 size={15} /></button>}</div></div>
            </div>
          </article>
        ))}
      </div> : <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-text-muted"><ImageIcon className="mx-auto mb-3 h-10 w-10" /><p>No media matches this search/filter.</p></div>}
    </div>
  );
}
