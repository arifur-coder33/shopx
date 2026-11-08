"use client";

import { updateOrderAddressByAdmin } from "@/backend/serverActions/orderActions";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function AdminOrderAddressEditor({ order, canUpdate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ deliveryAddress: order.deliveryAddress || "", thana: order.thana || "", city: order.city || "", deliveryCharge: String(order.deliveryCharge ?? 0) });
  if (!canUpdate) return null;
  const save = (event) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateOrderAddressByAdmin({ orderId: order.id, ...form });
      if (!result.success) return toast.error(result.message);
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  };
  return <div className="card space-y-3">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">ডেলিভারি ঠিকানা</h3><button type="button" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-border px-3 py-2 text-sm font-semibold">{open ? "বন্ধ করুন" : "ঠিকানা আপডেট"}</button></div>
    {open && <form onSubmit={save} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium">বাসা/রোড/এলাকা<textarea required rows={3} maxLength={500} value={form.deliveryAddress} onChange={(event) => setForm({ ...form, deliveryAddress: event.target.value })} className="w-full rounded-lg border border-border bg-surface p-3" /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">থানা/উপজেলা<input required maxLength={100} value={form.thana} onChange={(event) => setForm({ ...form, thana: event.target.value })} className="w-full rounded-lg border border-border bg-surface p-3" /></label><label className="grid gap-1 text-sm font-medium">জেলা<input required maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="w-full rounded-lg border border-border bg-surface p-3" /></label></div>
      <label className="grid max-w-xs gap-1 text-sm font-medium">ডেলিভারি চার্জ (৳)<input required type="number" min="0" max="1000000000" step="0.01" value={form.deliveryCharge} onChange={(event) => setForm({ ...form, deliveryCharge: event.target.value })} className="w-full rounded-lg border border-border bg-surface p-3" /></label>
      <button disabled={pending} className="justify-self-end rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">{pending ? "আপডেট হচ্ছে…" : "ঠিকানা ও চার্জ সংরক্ষণ"}</button>
    </form>}
    <p className="text-xs text-text-muted">Courier-এ পাঠানোর আগে ঠিকানা ও delivery charge পরিবর্তন করা যাবে। নতুন চার্জ অনুযায়ী বাকি টাকা এবং pending Bangla QR amount আপডেট হবে। পরিবর্তন timeline-এ যোগ হবে।</p>
  </div>;
}
