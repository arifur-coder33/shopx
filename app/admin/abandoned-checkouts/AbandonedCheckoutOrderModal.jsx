"use client";

import { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { createAbandonedCheckoutOrderAction, getAbandonedCheckoutOrderFormAction } from "@/backend/serverActions/abandonedCheckoutActions";
import CourierSelector from "@/app/admin/orders/_components/courier/CourierSelector";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary";

export default function AbandonedCheckoutOrderModal({ lead, onClose, onCreated }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courierEnabled, setCourierEnabled] = useState(false);
  const [courier, setCourier] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getAbandonedCheckoutOrderFormAction(lead.id).then((result) => {
      if (!active) return;
      if (!result.success) setError(result.message || "Order form খোলা যায়নি।");
      else setForm({ ...result.data, items: result.data.items.map((item) => ({
        ...item,
        quantity: item.quantity || 1,
        bundleSelections: Object.fromEntries((item.bundleOptions || []).map((option) => {
          const saved = item.bundleSelections?.[option.id];
          const selected = Array.isArray(saved) && saved.length === option.quantity
            ? saved
            : !option.requiresSelection && option.options[0]?.id ? Array(option.quantity).fill(option.options[0].id) : [];
          return [option.id, selected];
        })),
      })) });
      setLoading(false);
    }).catch(() => {
      if (active) { setError("Order form খোলা যায়নি।"); setLoading(false); }
    });
    return () => { active = false; };
  }, [lead.id]);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index, changes) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
  }));

  const submit = (event) => {
    event.preventDefault();
    if (!form) return;
    const missing = form.items.find((item) => item.unavailable || !item.variationId);
    if (missing) { setError(`${missing.name}: পণ্য/variation নির্বাচন করা যাচ্ছে না।`); return; }
    const missingBundleOption = form.items.find((item) => (item.bundleOptions || []).some((option) => item.bundleSelections?.[option.id]?.length !== option.quantity || item.bundleSelections[option.id].some((id) => !id)));
    if (missingBundleOption) { setError(`${missingBundleOption.name}: Bundle-এর সব variation নির্বাচন করুন।`); return; }
    if (courierEnabled && !courier) { setError("Courier বেছে নিন, অথবা courier option বন্ধ করুন।"); return; }
    const input = {
      leadId: lead.id,
      customerName: form.customerName,
      phoneNumber: form.phoneNumber,
      email: form.email,
      district: form.district,
      thana: form.thana,
      deliveryAddress: form.deliveryAddress,
      note: form.note,
      deliveryArea: form.deliveryArea,
      items: form.items.map(({ index, variationId, quantity, bundleSelections }) => ({ sourceIndex: index, variationId, quantity, bundleSelections })),
      courier: courierEnabled ? { courierProviderId: courier.id, pickupPointId: form.pickupPointId || "", manualEntry, cn: form.cn, note: form.courierNote || form.note } : null,
    };
    startTransition(async () => {
      setError("");
      const result = await createAbandonedCheckoutOrderAction(input);
      if (!result.success) { setError(result.message || "Order তৈরি হয়নি।"); return; }
      toast.success(`Order #${result.data.orderNo} তৈরি হয়েছে এবং Processing-এ গেছে।`);
      if (result.data.courierWarning) toast.warning(result.data.courierWarning);
      onCreated(lead.id);
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="abandoned-order-title" className="flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6"><div><h2 id="abandoned-order-title" className="text-lg font-bold text-text-primary">Abandoned checkout থেকে Order</h2><p className="text-xs text-text-muted">তথ্য যাচাই করে order তৈরি করুন; পণ্যের বর্তমান মূল্য server থেকে নেওয়া হবে।</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="বন্ধ করুন" className="rounded-lg p-2 hover:bg-surface-muted disabled:opacity-50"><X className="h-5 w-5" /></button></header>
        {loading ? <p className="p-8 text-center text-sm text-text-muted">তথ্য লোড হচ্ছে…</p> : !form ? <p className="p-5 text-sm text-rose-600">{error}</p> : (
          <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {[["customerName", "Customer name"], ["phoneNumber", "Phone number"], ["district", "জেলা"], ["thana", "থানা/উপজেলা"], ["deliveryAddress", "Delivery address"], ["email", "Email (optional)"]].map(([key, label]) => <label key={key} className="text-xs font-semibold text-text-muted">{label}<input required={!['email'].includes(key)} type={key === "phoneNumber" ? "tel" : "text"} maxLength={key === "deliveryAddress" ? 500 : 160} value={form[key] || ""} onChange={(event) => updateField(key, event.target.value)} className={fieldClass} /></label>)}
              <label className="text-xs font-semibold text-text-muted">Delivery area<select value={form.deliveryArea} onChange={(event) => updateField("deliveryArea", event.target.value)} className={fieldClass}><option value="inside-dhaka">ঢাকার ভিতরে</option><option value="outside-dhaka">ঢাকার বাইরে</option></select></label>
              <label className="text-xs font-semibold text-text-muted">Order note<input value={form.note || ""} onChange={(event) => updateField("note", event.target.value)} className={fieldClass} /></label>
            </div>
            <section className="space-y-3 rounded-xl border border-border p-3"><h3 className="font-semibold text-text-primary">Products</h3>{form.items.map((item, index) => <div key={`${item.index}-${index}`} className="grid gap-2 rounded-lg bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_8rem_6rem]"><div className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong>{item.unavailable ? <small className="text-rose-600">{item.message}</small> : <select value={item.variationId} onChange={(event) => updateItem(index, { variationId: event.target.value })} className={fieldClass}>{item.variations.map((variation) => <option key={variation.id} value={variation.id}>{variation.label} · ৳{(variation.discountPrice > 0 && variation.discountPrice < variation.regularPrice ? variation.discountPrice : variation.regularPrice).toLocaleString("en-BD")}</option>)}</select>}</div><label className="text-xs text-text-muted">Quantity<input type="number" min="1" max="99" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className={fieldClass} /></label><button type="button" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="self-end rounded-lg px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Remove</button>
                {(item.bundleOptions || []).length > 0 && <div className="space-y-2 sm:col-span-3">{item.bundleOptions.map((option) => <label key={option.id} className="block text-xs font-medium text-text-muted">{option.title} · {option.quantity} pcs<select value={item.bundleSelections?.[option.id]?.[0] || ""} onChange={(event) => updateItem(index, { bundleSelections: { ...item.bundleSelections, [option.id]: Array(option.quantity).fill(event.target.value) } })} className={fieldClass}><option value="">Select variation</option>{option.options.map((entry) => <option key={entry.id} value={entry.id} disabled={!entry.available}>{entry.label}{!entry.available ? " · stock নেই" : ""}</option>)}</select></label>)}</div>}
              </div>)}</section>
            <section className="space-y-3 rounded-xl border border-border p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={courierEnabled} onChange={(event) => { setCourierEnabled(event.target.checked); setCourier(null); setManualEntry(false); }} />Order তৈরি করার সঙ্গে courier booking</label>{courierEnabled && <>{courier ? <div className="space-y-3"><div className="flex items-center justify-between rounded-lg bg-surface-muted p-3 text-sm"><span className="font-semibold">{courier.name}{manualEntry ? " · Manual" : ""}</span><button type="button" onClick={() => { setCourier(null); setManualEntry(false); }} className="text-primary">Change</button></div>{courier.pickupPoints?.length > 0 && <label className="block text-xs font-semibold text-text-muted">Pickup point<select required={courier.adapterKey === "PATHAO" && !manualEntry} value={form.pickupPointId || ""} onChange={(event) => updateField("pickupPointId", event.target.value)} className={fieldClass}><option value="">Select pickup point</option>{courier.pickupPoints.map((point) => <option value={point.id} key={point.id}>{point.name} · {point.address}</option>)}</select></label>}{manualEntry && <label className="block text-xs font-semibold text-text-muted">Consignment number<input required value={form.cn || ""} onChange={(event) => updateField("cn", event.target.value)} className={fieldClass} /></label>}<label className="block text-xs font-semibold text-text-muted">Courier note<input maxLength={480} value={form.courierNote || ""} onChange={(event) => updateField("courierNote", event.target.value)} placeholder="Call before delivery" className={fieldClass} /></label></div> : <CourierSelector onSelect={(selected, isManual) => { setCourier(selected); setManualEntry(isManual); updateField("pickupPointId", selected.pickupPoints?.[0]?.id || ""); }} />}</>}</section>
            <p className="text-xs text-text-muted">Order তৈরির পর স্বয়ংক্রিয়ভাবে Processing হবে; সেই transition‑এ Purchase event পাঠানো হবে। Payment method: Cash on Delivery.</p>
            <button type="submit" disabled={busy || loading || !form.items.length} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Order তৈরি হচ্ছে…" : courierEnabled ? "Create order & courier" : "Create order"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
