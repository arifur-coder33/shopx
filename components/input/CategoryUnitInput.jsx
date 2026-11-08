"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { addCategoryUnit, getCategoryUnitOptions } from "@/backend/serverActions/categoryUnitActions";

export default function CategoryUnitInput({ parentId, categoryId, defaultValue }) {
  const [options, setOptions] = useState(null);
  const [added, setAdded] = useState([]);
  const [unit, setUnit] = useState(defaultValue || "");
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getCategoryUnitOptions(parentId).then((result) => {
      if (active) setOptions({ ...result, parentId });
    }).catch(() => {
      if (active) setOptions({ error: true, parentId });
    });
    return () => { active = false; };
  }, [parentId]);

  function add() {
    startTransition(async () => {
      const result = await addCategoryUnit(draft, categoryId);
      if (result.error) return toast.error(result.error);
      setAdded((items) => [...items, result.name]);
      setUnit(result.name);
      setDraft("");
    });
  }

  const inherited = options?.parentId === parentId ? options?.inherited : undefined;
  const values = [...new Set(["pcs", ...(options?.units || []), ...added, unit].filter(Boolean))];
  const field = "rounded border border-border bg-surface p-2";
  return <div className="col-span-full flex flex-wrap items-end gap-2">
    <label className="grid gap-1 text-sm font-medium">Unit
      <select name="unitName" value={unit} className={field} onChange={(event) => setUnit(event.target.value)}>
        <option value="">{parentId ? inherited ? `Inherit: ${inherited}` : "Inherit parent unit" : "Default: pcs"}</option>
        {values.map((name) => <option key={name}>{name}</option>)}
      </select>
    </label>
    <label className="grid gap-1 text-sm font-medium">New unit
      <input value={draft} maxLength={32} className={field} placeholder="Ex: bundle" onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (!pending && draft.trim()) add();
        }
      }} />
    </label>
    <button type="button" className={field} disabled={pending || !draft.trim()} onClick={add}>Add unit</button>
    {options?.error && <p className="text-sm text-danger">Could not load unit options.</p>}
  </div>;
}
