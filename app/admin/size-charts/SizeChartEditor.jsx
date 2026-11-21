"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import FileInput from "@/components/input/FileInput";
import { addChartSize, saveSizeChart } from "@/backend/serverActions/sizeChartActions";

const field = "rounded border border-border bg-surface px-2 py-1.5";
const button = "rounded border border-border px-3 py-1.5 disabled:opacity-50";

export default function SizeChartEditor({ chart, options, canAddSize, onSaved }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sizes, setSizes] = useState(chart?.sizes || []);
  const [rows, setRows] = useState(() => (chart?.rows || []).map((row, index) => ({
    ...row,
    key: String(index),
    cells: Object.fromEntries(Object.entries(row.cells).map(([size, values]) => [size, values.join("-")])),
  })));
  const [newSize, setNewSize] = useState("");
  const [added, setAdded] = useState([]);
  const hasRecommendation = rows.some((row) => row.kind === "recommendation");
  const values = [...new Set([...options.map(({ value }) => value), ...added, ...sizes])];

  function addSize() {
    startTransition(async () => {
      const result = await addChartSize(newSize);
      if (result.error) return toast.error(result.error);
      setAdded((items) => [...items, result.value]);
      setSizes((items) => items.includes(result.value) ? items : [...items, result.value]);
      setNewSize("");
    });
  }

  function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("table", JSON.stringify({ sizes, rows: rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(sizes.map((size) => [size, row.cells[size] ?? ""])),
    })) }));
    startTransition(async () => {
      const result = await saveSizeChart(chart?.id, form);
      if (result.error) return toast.error(result.error);
      toast.success("Size chart saved.");
      onSaved?.();
      router.refresh();
    });
  }

  function updateRow(key, update) {
    setRows((items) => items.map((row) => row.key === key ? update(row) : row));
  }

  function addRow(kind) {
    const row = { key: crypto.randomUUID(), kind, name: "", cells: {} };
    setRows((items) => kind === "recommendation"
      ? items.some((item) => item.kind === kind) ? items : [row, ...items]
      : [...items, row]);
  }

  return <form onSubmit={save} className="mt-4 space-y-4">
    <fieldset disabled={pending} className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-4">
        <label className="grid gap-1">Chart name<input className={field} name="name" required maxLength={120} defaultValue={chart?.name} placeholder="Men’s baggy fit" /></label>
        <label className="grid gap-1">Default unit<select className={field} name="unit" defaultValue={chart?.unit || "inch"}><option>inch</option><option>cm</option><option>mm</option></select></label>
      </div>
      <FileInput name="imageId" label="Size guide photo" defaultValue={chart?.image} />
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">Select size
          <select className={field} value="" onChange={(event) => setSizes([...sizes, event.target.value])}>
            <option value="" disabled>Choose a Size value</option>
            {values.filter((value) => !sizes.includes(value)).map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        {canAddSize && <label className="grid gap-1">New Size value<input className={field} value={newSize} maxLength={50} onChange={(event) => setNewSize(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") { event.preventDefault(); if (newSize.trim()) addSize(); }
        }} /></label>}
        {canAddSize && <button className={button} type="button" disabled={!newSize.trim()} onClick={addSize}>Add size</button>}
      </div>
      <button className={button} type="button" disabled={hasRecommendation} onClick={() => addRow("recommendation")}>Add recommendation</button>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th className="p-2">Measurement / recommendation</th>
            {sizes.map((size) => <th className="whitespace-nowrap p-2" key={size}>{size} <button type="button" aria-label={`Remove size ${size}`} onClick={() => setSizes(sizes.filter((value) => value !== size))}>×</button></th>)}
            <th aria-label="Row actions" />
          </tr></thead>
          <tbody>{[...rows.filter((row) => row.kind === "recommendation"), ...rows.filter((row) => row.kind !== "recommendation")].map((row) => <tr className="border-t border-border" key={row.key}>
            <th className="p-2"><label className="grid gap-1">{row.kind === "recommendation" ? "Recommended for" : "Measurement name"}
              <input required className={field} maxLength={100} placeholder="Ex: waist" value={row.name} onChange={(event) => updateRow(row.key, (item) => ({ ...item, name: event.target.value }))} />
            </label></th>
            {sizes.map((size) => <td className="p-2" key={size}>
              <input
                aria-label={`${row.name || row.kind}, size ${size}`}
                placeholder={row.kind === "recommendation" ? "Ex: 31-32" : "Value"}
                className={`${field} w-28`}
                type={row.kind === "recommendation" ? "text" : "number"}
                step="any" min="0" required value={row.cells[size] ?? ""}
                onChange={(event) => updateRow(row.key, (item) => ({
                  ...item,
                  cells: { ...item.cells, [size]: event.target.value },
                }))}
              />
            </td>)}
            <td><button type="button" className={button} onClick={() => setRows(rows.filter((item) => item.key !== row.key))}>Remove row</button></td>
          </tr>)}</tbody>
        </table>
      </div>
      <label className="grid gap-1">Note (optional)
        <textarea className={`${field} min-h-20 resize-y`} name="note" maxLength={3000} defaultValue={chart?.note || ""} placeholder="Add fit advice or measurement instructions shown below the size chart." />
      </label>
      <div className="flex flex-wrap gap-2">
        <button className={button} type="button" onClick={() => addRow("measurement")}>Add measurement</button>
        <button className="rounded bg-primary px-3 py-1.5 font-semibold text-white" type="submit">{pending ? "Saving…" : "Save size chart"}</button>
      </div>
    </fieldset>
  </form>;
}
