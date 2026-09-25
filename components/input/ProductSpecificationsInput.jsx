"use client";
import { useEffect, useId, useState } from "react";
import { getCategorySpecifications } from "@/backend/serverActions/specificationActions";
import FloatingInput from "./FloatingInput";

export default function ProductSpecificationsInput({ categoryId, initialCategoryId, defaultValue, name }) {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listId = useId();
  useEffect(() => {
    setValues(Object.fromEntries((defaultValue || []).map((row) => [row.specificationId, row.value])));
  }, [defaultValue]);
  useEffect(() => {
    let active = true;
    setFields([]);
    setError("");
    setLoading(Boolean(categoryId));
    if (categoryId) getCategorySpecifications(categoryId).then((result) => {
      if (!active) return;
      if (result.success) setFields(result.data);
      else setError(result.message);
    }).catch(() => { if (active) setError("Unable to load specifications. Reselect the category to retry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [categoryId]);
  // Keep old values visible after a category change until explicitly removed.
  // The server rejects unmatched IDs, so switching categories never silently erases data.
  const unmatched = !loading && !error && categoryId && categoryId !== initialCategoryId
    ? (defaultValue || []).filter((row) => values[row.specificationId] && !fields.some((field) => field.specificationId === row.specificationId)) : [];
  const outgoing = [...fields.map((field) => ({ specificationId: field.specificationId, value: values[field.specificationId] || "" })), ...unmatched.map((row) => ({ specificationId: row.specificationId, value: values[row.specificationId] }))];
  return <fieldset className="col-span-full space-y-4 rounded-xl border border-border p-4">
    <legend className="px-1 text-lg font-bold">Product specifications</legend>
    {!categoryId && <p className="text-sm">Select a category to enter specifications.</p>}
    {loading && <p role="status">Loading specifications…</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!loading && categoryId && !fields.length && !error && <p className="text-sm text-slate-500">No specifications assigned to this category.</p>}
    <div className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <div key={field.id}>
      <FloatingInput label={field.specification.parent ? `${field.specification.parent.name} / ${field.specification.name}` : field.specification.name} value={values[field.specificationId] || ""} maxLength={2000} list={`${listId}-${field.id}`} onChange={(event) => setValues((previous) => ({ ...previous, [field.specificationId]: event.target.value }))} />
      <datalist id={`${listId}-${field.id}`}>{field.options.map((option) => <option key={option} value={option} />)}</datalist>
    </div>)}</div>
    {!!unmatched.length && <div role="alert" className="rounded-lg border border-amber-500 p-3 text-sm"><p>These values are not assigned to the new category. Remove them before saving, or restore the previous category.</p>{unmatched.map((row) => <div key={row.specificationId} className="mt-2 flex justify-between gap-3"><span>{row.specification?.name}: {row.value}</span><button type="button" className="text-red-600 underline" onClick={() => setValues((previous) => ({ ...previous, [row.specificationId]: "" }))}>Remove value</button></div>)}</div>}
    <input type="hidden" name={name} value={loading || error ? "NOT_READY" : JSON.stringify(outgoing)} />
  </fieldset>;
}
