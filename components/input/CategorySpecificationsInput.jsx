"use client";

import { useEffect, useState } from "react";
import { getSpecifications } from "@/backend/serverActions/specificationActions";
import FloatingInput from "./FloatingInput";
import SearchableDropdown from "./SearchableDropdown";

const blank = () => ({ key: crypto.randomUUID(), parent: null, child: null, optionsText: "" });
export default function CategorySpecificationsInput({ name, defaultValue }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    setRows((defaultValue || []).map((row) => ({
      key: row.id, parent: row.specification.parent || row.specification,
      child: row.specification.parentId ? row.specification : null,
      optionsText: (row.options || []).join(", "),
    })));
  }, [defaultValue]);
  function change(key, values) { setRows((previous) => previous.map((row) => row.key === key ? { ...row, ...values } : row)); }
  async function load(parentId = null) {
    const result = await getSpecifications();
    setError(result.success ? "" : result.message);
    return { ...result, data: (result.data || []).filter((item) => parentId ? item.parentId === parentId : !item.parentId) };
  }
  return <fieldset className="col-span-full space-y-4 rounded-xl border border-border p-4">
    <legend className="px-1 text-lg font-bold">Specifications (optional)</legend>
    <p className="text-sm text-slate-500">Select a parent and optionally a child. Without a child, values belong to the parent. Enter suggested values separated by commas.</p>
    {rows.map((row) => <div key={row.key} className="grid grid-cols-1 items-start gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
      <SearchableDropdown label="Parent specification" defaultId={row.parent} loadLists={() => load()} addForm="SpecificationForm" addFormData={{ lockParent: true, onCreated: (item) => change(row.key, { parent: item, child: null }) }} onSelect={(parent) => change(row.key, { parent, child: null })} onClear={() => change(row.key, { parent: null, child: null })} />
      {row.parent ? <div className="space-y-1"><SearchableDropdown key={row.parent.id} label="Child (optional)" defaultId={row.child} loadLists={() => load(row.parent.id)} addForm="SpecificationForm" addFormData={{ lockParent: true, parentId: row.parent.id, parentName: row.parent.name, onCreated: (item) => change(row.key, { child: item }) }} onSelect={(child) => change(row.key, { child })} onClear={() => change(row.key, { child: null })} />{row.child && <button type="button" className="text-xs text-primary underline" onClick={() => change(row.key, { child: null })}>Use parent only</button>}</div> : <p className="py-3 text-sm text-slate-500">Select a parent first</p>}
      <FloatingInput label="Suggested values (optional)" value={row.optionsText} onChange={(event) => change(row.key, { optionsText: event.target.value })} />
      <button type="button" aria-label="Remove specification row" className="rounded-lg border px-3 py-2 text-red-600" onClick={() => setRows((previous) => previous.filter((item) => item.key !== row.key))}>Remove</button>
    </div>)}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button type="button" className="rounded-lg bg-primary px-4 py-2 text-white" onClick={() => setRows((previous) => [...previous, blank()])}>Add specification</button>
    <input type="hidden" name={name} value={JSON.stringify(rows.filter((row) => row.parent).map((row) => ({ specificationId: row.child?.id || row.parent.id, options: row.optionsText.split(",").map((value) => value.trim()).filter(Boolean) })))} />
  </fieldset>;
}
