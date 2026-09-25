"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { getSpecifications, saveSpecification, saveSpecifications } from "@/backend/serverActions/specificationActions";
import { useModalContext } from "@/context/ModalContext";
import FloatingInput from "@/components/input/FloatingInput";
import SearchableDropdown from "@/components/input/SearchableDropdown";

export default function SpecificationForm({ data = {}, id }) {
  const [record, setRecord] = useState(data);
  const [rows, setRows] = useState([{ name: "", parentId: null, parent: null }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { closeModal } = useModalContext();
  const router = useRouter();
  useEffect(() => {
    if (id && !data.id) getSpecifications().then((result) => {
      const found = result.data?.find((item) => item.id === id);
      if (found) setRecord(found);
      else setError(result.message || "Specification not found.");
    });
  }, [id, data.id]);
  async function loadParents() {
    const result = await getSpecifications();
    return { ...result, data: (result.data || []).filter((item) => !item.parentId && item.id !== id) };
  }
  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    form.set("id", id || record.id || "");
    form.set("parentId", record.parentId || "");
    try {
      const result = id || record.id
        ? await saveSpecification(form)
        : await saveSpecifications(new FormData(event.currentTarget));
      if (!result.success) { setError(result.message); return; }
      data.onCreated?.(result.data);
      toast.success(Array.isArray(result.data) ? `${result.data.length} specifications saved.` : "Specification saved.");
      closeModal();
      router.refresh();
    } catch { setError("Unable to save specification. Please try again."); }
    finally { setBusy(false); }
  }
  function updateRow(index, patch) { setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row)); }
  return <form onSubmit={submit} className="w-full space-y-5 p-2 sm:min-w-96">
    <h2 className="text-xl font-bold">{id ? "Edit" : "Add"} specification{!id && "s"}</h2>
    {id ? <>
      <FloatingInput label="Specification name" name="name" key={record.id || "new"} defaultValue={record.name || ""} maxLength={100} required />
      {data.lockParent ? <p className="text-sm">{data.parentName ? `Parent: ${data.parentName}` : "Top-level specification"}</p> : <SearchableDropdown label="Parent (optional)" loadLists={loadParents} defaultId={record.parent || (record.parentId ? { id: record.parentId, name: data.parentName || "Selected parent" } : null)} onSelect={(parent) => setRecord((previous) => ({ ...previous, parentId: parent.id, parent }))} onClear={() => setRecord((previous) => ({ ...previous, parentId: null, parent: null }))} />}
      {!data.lockParent && record.parentId && <button type="button" className="text-sm text-primary underline" onClick={() => setRecord((previous) => ({ ...previous, parentId: null, parent: null }))}>Remove parent — use as a group</button>}
    </> : <>
      <p className="text-sm text-text-muted">Add multiple reusable specifications together. Parent is optional.</p>
      {rows.map((row, index) => <div key={index} className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between"><span className="text-sm font-semibold">Specification {index + 1}</span>{rows.length > 1 && <button type="button" className="text-sm text-red-600" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Remove</button>}</div>
        <FloatingInput label="Specification name" name={`specification-name-${index}`} value={row.name} onChange={(event) => updateRow(index, { name: event.target.value })} maxLength={100} required />
        <SearchableDropdown label="Parent (optional)" loadLists={loadParents} defaultId={row.parent} onSelect={(parent) => updateRow(index, { parentId: parent.id, parent })} onClear={() => updateRow(index, { parentId: null, parent: null })} />
      </div>)}
      <input type="hidden" name="specifications" value={JSON.stringify(rows.map(({ name, parentId }) => ({ name, parentId })))} readOnly />
      <button type="button" className="rounded-lg border px-4 py-2" onClick={() => setRows((current) => [...current, { name: "", parentId: null, parent: null }])}>+ Add another</button>
    </>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    <button disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-white disabled:opacity-50">{busy ? "Saving…" : "Save specification"}</button>
  </form>;
}
