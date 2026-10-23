"use client";

import { useEffect, useState } from "react";

const empty = { variantId: "", customerName: "", phoneNumber: "", deliveryAddress: "", district: "", thana: "", deliveryArea: "outside-dhaka" };
const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 outline-none focus:border-violet-600";

export default function MessengerOrderForm({ token }) {
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!token) { setLoading(false); setError("লিংকটি সঠিক নয়।"); return; }
    fetch(`/api/chat/messenger-order?t=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !data.success) throw new Error(data.message || "ফর্ম খোলা যাচ্ছে না।"); return data.data; })
      .then((data) => { setProduct(data); if (data.variants.length === 1) setForm((current) => ({ ...current, variantId: data.variants[0].id })); })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    if (!/^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(form.phoneNumber.replace(/\D/g, ""))) { setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন।"); return; }
    if (product?.canCreateOrder && !form.variantId) { setError("ভ্যারিয়েন্ট বেছে নিন।"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/chat/messenger-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...form }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "তথ্য পাঠানো যায়নি।");
      setResult(data.data);
    } catch (submitError) { setError(submitError.message); }
    finally { setBusy(false); }
  };

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900"><div className="mx-auto max-w-lg rounded-2xl bg-white p-5 shadow-sm"><h1 className="text-xl font-bold">{product?.canCreateOrder ? "অর্ডার করুন" : "যোগাযোগের তথ্য দিন"}</h1>{loading && <p className="mt-4">অপেক্ষা করুন…</p>}{error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{result ? <div className="mt-5 space-y-3"><p className="font-medium">{result.message}</p>{result.orderNo && <p>অর্ডার নম্বর: <strong>{result.orderNo}</strong></p>}{result.trackingUrl && <a href={result.trackingUrl} className="inline-block rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white">অর্ডার ট্র্যাক করুন</a>}</div> : product && <><p className="mt-2 text-sm text-slate-600">{product.title}</p>{product.canCreateOrder && !product.canOrderInChat ? <div className="mt-5 space-y-3"><p>এই পণ্যে অনলাইন/অগ্রিম পেমেন্ট লাগে। ওয়েবসাইটে অর্ডার করুন।</p><a href={product.websiteUrl} className="inline-block rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white">অর্ডার পেজে যান</a></div> : <form onSubmit={submit} className="mt-5 space-y-4">{product.canCreateOrder && <fieldset><legend className="font-semibold">ভ্যারিয়েন্ট বেছে নিন</legend><div className="mt-2 grid gap-2">{product.variants.map((variant) => <button key={variant.id} type="button" disabled={!variant.inStock} onClick={() => setForm((current) => ({ ...current, variantId: variant.id }))} className={`rounded-xl border p-3 text-left text-sm ${form.variantId === variant.id ? "border-violet-700 bg-violet-50" : "border-slate-300"} disabled:opacity-45`}>{variant.label} · ৳{variant.price}{!variant.inStock && " · স্টক নেই"}</button>)}</div></fieldset>}{[["customerName", "আপনার নাম"], ["phoneNumber", "মোবাইল নম্বর"], ["deliveryAddress", "সম্পূর্ণ ঠিকানা"], ...(product.canCreateOrder ? [["district", "জেলা"], ["thana", "থানা"]] : [])].map(([field, label]) => <label key={field} className="block text-sm font-medium">{label}<input required value={form[field]} type={field === "phoneNumber" ? "tel" : "text"} inputMode={field === "phoneNumber" ? "numeric" : undefined} autoComplete={field === "phoneNumber" ? "tel" : field === "customerName" ? "name" : undefined} maxLength={field === "phoneNumber" ? 13 : field === "deliveryAddress" ? 250 : 100} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} className={inputClass} /></label>)}{product.canCreateOrder && <label className="block text-sm font-medium">ডেলিভারি এলাকা<select value={form.deliveryArea} onChange={(event) => setForm((current) => ({ ...current, deliveryArea: event.target.value }))} className={inputClass}><option value="inside-dhaka">ঢাকার ভিতরে</option><option value="outside-dhaka">ঢাকার বাইরে</option></select></label>}{product.canCreateOrder && <p className="text-sm text-slate-600">পেমেন্ট: ক্যাশ অন ডেলিভারি। অনলাইন পেমেন্টের জন্য ওয়েবসাইটে অর্ডার করুন।</p>}<button disabled={busy} type="submit" className="w-full rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "পাঠানো হচ্ছে…" : product.canCreateOrder ? "Place Order" : "তথ্য পাঠান"}</button></form>}</>}</div></main>;
}
