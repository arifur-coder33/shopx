"use client";

import { getCustomerOrderHistoryForAdmin } from "@/backend/serverActions/orderActions";
import { useEffect, useState } from "react";
import { History, X } from "lucide-react";

const statusLabel = (status) => String(status || "UNKNOWN").replaceAll("_", " ");
const dateLabel = (value) => new Date(value).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" });

export default function CustomerOrderHistoryButton({ phoneNumber, autoLoad = false }) {
  const [history, setHistory] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async (offset = 0) => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await getCustomerOrderHistoryForAdmin(phoneNumber, offset);
      if (!result?.success) return;
      setHistory((current) => offset ? {
        ...result.data,
        orders: [...(current?.orders || []), ...(result.data.orders || [])],
      } : result.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLoad && phoneNumber) load();
    // Run once for the current order detail.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, phoneNumber]);

  const openHistory = async (event) => {
    event?.stopPropagation?.();
    setIsOpen(true);
    if (!history) await load();
  };

  return (
    <div className="min-w-0">
      {history && <div className="mb-1.5 flex flex-wrap gap-1 text-[10px] font-medium text-text-muted">
        <span className="rounded-md bg-surface-muted px-1.5 py-1">মোট {history.total} অর্ডার</span>
        <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-emerald-800">ডেলিভারি {history.delivered}</span>
        <span className="rounded-md bg-amber-50 px-1.5 py-1 text-amber-800">রিটার্ন {history.returned}</span>
      </div>}
      <button type="button" onClick={openHistory} className="inline-flex min-h-7 items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/10">
        <History className="h-3 w-3" /> {loading ? "লোড হচ্ছে…" : "গ্রাহকের সব অর্ডার"}
      </button>
      {isOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-label="গ্রাহকের অর্ডার ইতিহাস" className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div><h2 className="text-sm font-bold text-text-primary">গ্রাহকের অর্ডার ইতিহাস</h2><p className="text-xs text-text-muted">{phoneNumber} · মোট {history?.total ?? "…"}টি</p></div>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="বন্ধ করুন" className="rounded-lg p-2 hover:bg-surface-muted"><X className="h-4 w-4" /></button>
          </header>
          <div className="flex gap-2 border-b border-border px-4 py-2 text-xs font-semibold">
            <span className="rounded-lg bg-surface-muted px-2.5 py-1.5">সব {history?.total ?? "…"}</span>
            <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800">ডেলিভারি {history?.delivered ?? "…"}</span>
            <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">রিটার্ন {history?.returned ?? "…"}</span>
          </div>
          <div className="overflow-y-auto p-3">
            {history?.orders?.map((order) => <article key={order.id} className="mb-2 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-2"><strong className="text-sm text-text-primary">#{order.orderNo}</strong><span className="rounded-full bg-surface-muted px-2 py-1 text-[10px] font-semibold text-text-secondary">{statusLabel(order.status)}</span></div>
              <p className="mt-1 text-[11px] text-text-muted">{dateLabel(order.createdAt)} · ৳{Number(order.orderPrice + (order.deliveryCharge || 0)).toLocaleString("en-BD")}</p>
              <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{(order.orderItems || []).map((item) => `${item.productName} ×${item.quantity}`).join(" · ")}</p>
            </article>)}
            {!history?.orders?.length && !loading && <p className="p-6 text-center text-sm text-text-muted">কোনো অর্ডার নেই।</p>}
            {history?.hasMore && <button type="button" disabled={loading} onClick={() => load(history.nextOffset)} className="w-full rounded-lg border border-border py-2 text-xs font-semibold text-primary disabled:opacity-50">{loading ? "লোড হচ্ছে…" : "আরও অর্ডার দেখুন"}</button>}
            {loading && !history && <p className="p-6 text-center text-sm text-text-muted">অর্ডার লোড হচ্ছে…</p>}
          </div>
        </section>
      </div>}
    </div>
  );
}
