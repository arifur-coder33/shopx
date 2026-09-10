"use client";

import { ChevronDown, ChevronUp, Plus, Trash2, Video } from "lucide-react";
import { useRef, useState } from "react";

const inputClass =
  "w-full rounded-brand border border-border bg-surface px-3 py-2.5 text-base text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export default function ProductVideosInput({ name = "videos", label, defaultValue = [] }) {
  const nextKey = useRef(1);
  const initialRows = Array.isArray(defaultValue) && defaultValue.length
    ? defaultValue
    : [{ header: "", url: "" }];
  const [rows, setRows] = useState(() =>
    initialRows.map((row) => ({ ...row, _key: row.id || `video-${nextKey.current++}` })),
  );

  const update = (index, key, value) => {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [key]: value } : row,
      ),
    );
  };
  const add = () => setRows((current) => [
    ...current,
    { _key: `video-${nextKey.current++}`, header: "", url: "" },
  ]);
  const remove = (index) => setRows((current) => {
    const next = current.filter((_, rowIndex) => rowIndex !== index);
    return next.length ? next : [{ _key: `video-${nextKey.current++}`, header: "", url: "" }];
  });
  const move = (index, direction) => setRows((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const serialized = JSON.stringify(
    rows.map(({ header, url }, index) => ({
      header: header.trim(),
      url: url.trim(),
      sortOrder: index,
    })),
  );

  return (
    <section className="col-span-full rounded-2xl border border-border bg-surface-muted/45 p-3 sm:p-4">
      <input type="hidden" name={name} value={serialized} readOnly />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-text"><Video size={18} className="text-primary" />{label || "Product videos"}</h3>
          <p className="text-xs text-text-muted">Add YouTube, Vimeo or direct MP4/WebM URLs. Videos appear in this order.</p>
        </div>
        <button type="button" onClick={add} className="flex min-h-10 items-center gap-1.5 rounded-brand bg-primary px-3 py-2 text-sm font-bold text-white"><Plus size={16} /> Add video</button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row._key} className="rounded-xl border border-border bg-surface p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <strong className="text-sm text-primary">Video {index + 1}</strong>
              <div className="flex gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move video ${index + 1} up`} className="rounded-lg border border-border p-2 disabled:opacity-30"><ChevronUp size={15} /></button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label={`Move video ${index + 1} down`} className="rounded-lg border border-border p-2 disabled:opacity-30"><ChevronDown size={15} /></button>
                <button type="button" onClick={() => remove(index)} aria-label={`Remove video ${index + 1}`} className="rounded-lg border border-danger/30 p-2 text-danger hover:bg-danger/10"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(10rem,0.75fr)_minmax(15rem,1.25fr)]">
              <label className="grid gap-1 text-sm font-semibold">Video header<input className={inputClass} value={row.header || ""} onChange={(event) => update(index, "header", event.target.value)} maxLength={120} placeholder="যেমন: ব্যবহারবিধি" /></label>
              <label className="grid gap-1 text-sm font-semibold">Video URL<input className={inputClass} type="url" value={row.url || ""} onChange={(event) => update(index, "url", event.target.value)} placeholder="https://youtube.com/watch?v=..." /></label>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

