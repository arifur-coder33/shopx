"use client";

import { saveBundleComponents, searchBundleComponents } from "@/backend/serverActions/bundleActions";
import SearchableDropdown from "@/components/input/SearchableDropdown";
import { Plus } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { toast } from "react-toastify";

const field = "min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm";
export default function BundleItemsField({ product }) {
  const isCreate = !product;
  const [rows, setRows] = useState(product?.bundleItems || []);
  const [component, setComponent] = useState(null);
  const [pickerVersion, setPickerVersion] = useState(0);
  const [pending, startTransition] = useTransition();
  const canAdd = Boolean(component && !rows.some(({ id }) => id === component.id));

  const productId = product?.id || null;
  const search = useCallback(async (query) => {
    const results = await searchBundleComponents(productId, query);
    return results.map((item) => ({ ...item, name: [item.title, item.productCode].filter(Boolean).join(" · ") }));
  }, [productId]);

  function addComponent() {
    if (!canAdd) return;
    const { id, productCode, title } = component;
    setRows((current) => current.some((row) => row.id === id) ? current : [...current, { id, productCode, title, quantity: 1 }]);
    setComponent(null);
    setPickerVersion((version) => version + 1);
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await saveBundleComponents(product.id, rows.map((row) => ({ id: row.id, quantity: Number(row.quantity) })));
        if (result.success) toast.success("Bundle items saved.");
        else toast.error(result.message);
      } catch { toast.error("Bundle items could not be saved."); }
    });
  }

  return (
    <section className="my-5 space-y-3 rounded-xl border border-border bg-surface p-4">
      <h3 className="font-semibold">Bundle Items</h3>
      <p className="text-sm text-text-muted">Component পণ্য ও পরিমাণ যোগ করুন। সাইজ বা রঙ গ্রাহক পণ্যের পেজে বেছে নেবেন।</p>
      {isCreate && (
        <input type="hidden" name="bundleItems" value={JSON.stringify(rows.map(({ id, quantity }) => ({ id, quantity: Number(quantity) })))} readOnly />
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <SearchableDropdown
          key={pickerVersion}
          label="Component product name or code"
          searchOptions={search}
          onSelect={setComponent}
          onClear={() => setComponent(null)}
          disabled={pending}
        />
        <button type="button" className="button min-h-12 px-3" onClick={addComponent} disabled={pending || !canAdd} aria-label="Add component" title="Add component">
          <Plus size={20} aria-hidden="true" />
        </button>
      </div>
      {component && !canAdd && <p className="text-sm text-text-muted">পণ্যটি আগেই যোগ করা হয়েছে। বেশি লাগলে পরিমাণ বাড়ান।</p>}
      {rows.map((row) => (
        <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] items-center gap-2 text-sm">
          <span>{[row.title, row.productCode].filter(Boolean).join(" · ")}</span>
          <input aria-label={`Quantity for ${row.title}`} className={field} type="number" min="1" max="1000" step="1"
            value={row.quantity} disabled={pending} onChange={(event) => setRows((current) =>
              current.map((item) => item.id === row.id ? { ...item, quantity: event.target.value } : item))} />
          <button type="button" className="text-rose-600" disabled={pending} onClick={() => setRows((current) => current.filter(({ id }) => id !== row.id))}>Remove</button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Total components: {rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0)}</p>
        {isCreate
          ? <p className="text-sm text-text-muted">পণ্য সেভ করলে Bundle Items-ও সেভ হবে।</p>
          : <button className="button" type="button" disabled={pending || !rows.length} onClick={save}>Save Bundle Items</button>}
      </div>
    </section>
  );
}
