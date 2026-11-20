"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CreditCard, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { toast } from "react-toastify";
import { createAbandonedCheckoutOrderAction, getAbandonedCheckoutOrderFormAction, getAbandonedCheckoutProductForOrderAction } from "@/backend/serverActions/abandonedCheckoutActions";
import CourierSelector from "@/app/admin/orders/_components/courier/CourierSelector";
import { searchProductSuggestions } from "@/backend/serverActions/productActions";
import { calculateDeliveryCharge } from "@/lib/deliveryCharge";
import Imagecustom from "@/components/images/ImageCustom";

const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary";

export default function AbandonedCheckoutOrderModal({ lead, onClose, onCreated }) {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [courierEnabled, setCourierEnabled] = useState(false);
  const [courier, setCourier] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [extraDiscount, setExtraDiscount] = useState(0);
  const searchRef = useRef(null);
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

  useEffect(() => {
    const query = search.trim();
    if (!query) { setSearchResults([]); setSearchLoading(false); return; }
    let active = true;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await searchProductSuggestions(query);
        if (active) setSearchResults(result.products || []);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearchLoading(false);
      }
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [search]);

  useEffect(() => {
    const close = (event) => { if (!searchRef.current?.contains(event.target)) setSearchOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateItem = (index, changes) => setForm((current) => ({
    ...current,
    items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...changes } : item),
  }));

  const addProduct = async (product) => {
    setAddingProduct(true);
    try {
      const result = await getAbandonedCheckoutProductForOrderAction(product.slug);
      if (!result.success) { toast.error(result.message || "পণ্য যোগ করা যায়নি।"); return; }
      setForm((current) => {
        const existingIndex = current.items.findIndex((item) => item.productId === result.data.productId);
        if (existingIndex >= 0) return { ...current, items: current.items.map((item, index) => index === existingIndex ? { ...item, quantity: Math.min(99, Number(item.quantity || 1) + 1) } : item) };
        return { ...current, items: [...current.items, result.data] };
      });
      setSearch(""); setSearchResults([]); setSearchOpen(false);
    } catch {
      toast.error("পণ্য যোগ করা যায়নি। আবার চেষ্টা করুন।");
    } finally { setAddingProduct(false); }
  };

  const subtotal = useMemo(() => (form?.items || []).reduce((sum, item) => {
    const variation = item.variations?.find((entry) => entry.id === item.variationId);
    const price = variation?.discountPrice > 0 && variation.discountPrice < variation.regularPrice ? variation.discountPrice : variation?.regularPrice || 0;
    return sum + price * Math.max(1, Number(item.quantity) || 1);
  }, 0), [form?.items]);
  const totalWeight = useMemo(() => (form?.items || []).reduce((sum, item) => {
    const variation = item.variations?.find((entry) => entry.id === item.variationId);
    return sum + Math.max(0, Number(variation?.weight) || 0) * Math.max(1, Number(item.quantity) || 1);
  }, 0), [form?.items]);
  const deliveryCharge = form ? calculateDeliveryCharge(form.deliveryArea, totalWeight, form.deliveryRates) : 0;

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
      extraDiscount: Number(extraDiscount) || 0,
      items: form.items.map(({ index, slug, variationId, quantity, bundleSelections }) => ({ sourceIndex: Number.isInteger(index) ? index : null, productSlug: slug, variationId, quantity, bundleSelections })),
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
    <div className="fixed inset-0 z-[100] flex bg-black/50 p-0" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="abandoned-order-title" className="flex h-dvh w-full flex-col overflow-hidden bg-surface shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6"><h2 id="abandoned-order-title" className="text-base font-bold text-text-primary sm:text-lg">Abandoned checkout থেকে Order</h2><button type="button" onClick={onClose} disabled={busy} aria-label="বন্ধ করুন" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-surface-muted disabled:opacity-50"><X className="h-5 w-5" /></button></header>
        {loading ? <p className="p-8 text-center text-sm text-text-muted">তথ্য লোড হচ্ছে…</p> : !form ? <p className="p-5 text-sm text-rose-600">{error}</p> : (
          <form onSubmit={submit} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 pb-24 sm:p-6 sm:pb-28">
            {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {[["customerName", "Customer name"], ["phoneNumber", "Phone number"], ["district", "জেলা"], ["thana", "থানা/উপজেলা"], ["deliveryAddress", "Delivery address"], ["email", "Email (optional)"]].map(([key, label]) => <label key={key} className="text-xs font-semibold text-text-muted">{label}<input required={!['email'].includes(key)} type={key === "phoneNumber" ? "tel" : "text"} maxLength={key === "deliveryAddress" ? 500 : 160} value={form[key] || ""} onChange={(event) => updateField(key, event.target.value)} className={fieldClass} /></label>)}
              <label className="text-xs font-semibold text-text-muted">Delivery area<select value={form.deliveryArea} onChange={(event) => updateField("deliveryArea", event.target.value)} className={fieldClass}><option value="inside-dhaka">ঢাকার ভিতরে</option><option value="outside-dhaka">ঢাকার বাইরে</option></select></label>
              <label className="text-xs font-semibold text-text-muted">Order note<input value={form.note || ""} onChange={(event) => updateField("note", event.target.value)} className={fieldClass} /></label>
            </div>
            <section className="space-y-3 rounded-xl border border-border p-3"><h3 className="font-semibold text-text-primary">Products</h3><div ref={searchRef} className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => search.trim() && setSearchOpen(true)} placeholder="পণ্য খুঁজুন…" className={`${fieldClass} pl-10`} />{searchOpen && search.trim() && <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-xl">{searchLoading ? <p className="p-3 text-sm text-text-muted">পণ্য খোঁজা হচ্ছে…</p> : searchResults.length ? searchResults.map((product) => <button key={product.id} type="button" disabled={addingProduct} onClick={() => addProduct(product)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-primary-soft disabled:opacity-50">{product.thumbnail?.name ? <Imagecustom src={product.thumbnail.name} alt={product.title} w={40} h={40} className="h-10 w-10 shrink-0 rounded-md object-cover" unoptimized /> : <span className="h-10 w-10 shrink-0 rounded-md bg-surface-muted" />}<span className="min-w-0 flex-1 truncate text-sm font-medium">{product.title}</span><Plus className="h-4 w-4 text-primary" /></button>) : <p className="p-3 text-sm text-text-muted">কোনো পণ্য পাওয়া যায়নি</p>}</div>}</div>{form.items.map((item, index) => <div key={`${item.index}-${index}`} className="grid gap-2 rounded-lg bg-surface-muted p-3 sm:grid-cols-[minmax(0,1fr)_8rem_3rem]"><div className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong>{item.unavailable ? <small className="text-rose-600">{item.message}</small> : <select value={item.variationId} onChange={(event) => updateItem(index, { variationId: event.target.value })} className={fieldClass}>{item.variations.map((variation) => <option key={variation.id} value={variation.id}>{variation.label} · ৳{(variation.discountPrice > 0 && variation.discountPrice < variation.regularPrice ? variation.discountPrice : variation.regularPrice).toLocaleString("en-BD")}</option>)}</select>}</div><label className="text-xs text-text-muted">Quantity<input type="number" min="1" max="99" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} className={fieldClass} /></label><button type="button" aria-label={`${item.name} সরান`} title="পণ্য সরান" onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))} className="grid h-10 w-10 self-end place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                {(item.bundleOptions || []).length > 0 && <div className="space-y-2 sm:col-span-3">{item.bundleOptions.map((option) => <label key={option.id} className="block text-xs font-medium text-text-muted">{option.title} · {option.quantity} pcs<select value={item.bundleSelections?.[option.id]?.[0] || ""} onChange={(event) => updateItem(index, { bundleSelections: { ...item.bundleSelections, [option.id]: Array(option.quantity).fill(event.target.value) } })} className={fieldClass}><option value="">Select variation</option>{option.options.map((entry) => <option key={entry.id} value={entry.id} disabled={!entry.available}>{entry.label}{!entry.available ? " · stock নেই" : ""}</option>)}</select></label>)}</div>}
              </div>)}</section>
            <section className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2"><div className="space-y-2"><h3 className="font-semibold text-text-primary">Order summary</h3><p className="flex justify-between text-sm"><span>Subtotal</span><strong>৳{subtotal.toLocaleString("en-BD")}</strong></p><p className="flex justify-between text-sm"><span className="inline-flex items-center gap-1"><Truck className="h-4 w-4 text-primary" />Delivery charge</span><strong>৳{deliveryCharge.toLocaleString("en-BD")}</strong></p><label className="flex items-center justify-between gap-3 text-sm"><span>Extra discount</span><input type="number" min="0" max={subtotal + deliveryCharge} step="0.01" value={extraDiscount} onChange={(event) => setExtraDiscount(event.target.value)} className="min-h-10 w-36 rounded-lg border border-border bg-surface px-3 text-right" /></label><p className="flex justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span>৳{Math.max(0, subtotal + deliveryCharge - (Number(extraDiscount) || 0)).toLocaleString("en-BD")}</span></p></div><div><h3 className="mb-2 font-semibold text-text-primary">Payment method</h3><div className="flex min-h-[92px] items-center gap-3 rounded-xl border border-primary bg-primary-soft p-3"><span className="grid h-11 w-11 place-items-center rounded-lg bg-surface text-primary"><CreditCard className="h-6 w-6" /></span><span><strong className="block text-sm">Cash on Delivery</strong><small className="text-xs text-text-muted">কুরিয়ারে পেমেন্ট</small></span></div></div></section>
            <section className="space-y-3 rounded-xl border border-border p-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={courierEnabled} onChange={(event) => { setCourierEnabled(event.target.checked); setCourier(null); setManualEntry(false); }} />Order তৈরি করার সঙ্গে courier booking</label>{courierEnabled && <>{courier ? <div className="space-y-3"><div className="flex items-center justify-between rounded-lg bg-surface-muted p-3 text-sm"><span className="font-semibold">{courier.name}{manualEntry ? " · Manual" : ""}</span><button type="button" onClick={() => { setCourier(null); setManualEntry(false); }} className="text-primary">Change</button></div>{courier.pickupPoints?.length > 0 && <label className="block text-xs font-semibold text-text-muted">Pickup point<select required={courier.adapterKey === "PATHAO" && !manualEntry} value={form.pickupPointId || ""} onChange={(event) => updateField("pickupPointId", event.target.value)} className={fieldClass}><option value="">Select pickup point</option>{courier.pickupPoints.map((point) => <option value={point.id} key={point.id}>{point.name} · {point.address}</option>)}</select></label>}{manualEntry && <label className="block text-xs font-semibold text-text-muted">Consignment number<input required value={form.cn || ""} onChange={(event) => updateField("cn", event.target.value)} className={fieldClass} /></label>}<label className="block text-xs font-semibold text-text-muted">Courier note<input maxLength={480} value={form.courierNote || ""} onChange={(event) => updateField("courierNote", event.target.value)} placeholder="Call before delivery" className={fieldClass} /></label></div> : <CourierSelector onSelect={(selected, isManual) => { setCourier(selected); setManualEntry(isManual); updateField("pickupPointId", selected.pickupPoints?.[0]?.id || ""); }} />}</>}</section>
            <div className="sticky bottom-[-1px] z-20 -mx-3 mt-2 border-t border-border bg-surface/95 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur sm:-mx-6 sm:p-4 sm:pb-4"><button type="submit" disabled={busy || loading || !form.items.length} className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? "Order তৈরি হচ্ছে…" : courierEnabled ? "Create order & courier" : "Create order"}</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
