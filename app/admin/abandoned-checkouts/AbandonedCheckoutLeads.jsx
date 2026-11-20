"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Copy, Phone, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import { deleteAbandonedCheckoutLeadAction, getAbandonedCheckoutLeadsAction } from "@/backend/serverActions/abandonedCheckoutActions";
import { createOrderRealtimeToken } from "@/backend/serverActions/realtimeActions";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import AbandonedCheckoutOrderModal from "./AbandonedCheckoutOrderModal";

const digits = (value) => String(value || "").replace(/\D/g, "");
const relativeDate = (value) => {
  if (!value) return "";
  const age = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (age < 1) return "এইমাত্র";
  if (age < 60) return `${age} মিনিট আগে`;
  if (age < 1440) return `${Math.floor(age / 60)} ঘণ্টা আগে`;
  return new Date(value).toLocaleDateString("bn-BD", { day: "numeric", month: "short" });
};

export default function AbandonedCheckoutLeads({ initialLeads = [], canDelete = false }) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [isPending, startTransition] = useTransition();
  const syncInProgress = useRef(false);
  const syncLeads = useCallback(async () => {
    if (syncInProgress.current) return;
    syncInProgress.current = true;
    try {
      const latest = await getAbandonedCheckoutLeadsAction();
      setLeads(Array.isArray(latest) ? latest : []);
    } catch {
      // Keep the current list visible when a background sync fails.
    } finally {
      syncInProgress.current = false;
    }
  }, []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((lead) => `${lead.customerName} ${lead.phoneNumber} ${lead.district} ${lead.thana} ${(lead.items || []).map((item) => item.name).join(" ")}`.toLowerCase().includes(needle));
  }, [leads, query]);

  const handleRealtimeEvent = (event, payload) => {
    if (event === "abandoned-checkout.updated" && payload?.id) {
      setLeads((current) => [payload, ...current.filter((lead) => lead.id !== payload.id)]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } else if (event === "abandoned-checkout.deleted" && payload?.id) {
      setLeads((current) => current.filter((lead) => lead.id !== payload.id));
    }
  };
  const realtimeStatus = useRealtimeConnection({
    enabled: true,
    getAccessToken: createOrderRealtimeToken,
    onEvent: handleRealtimeEvent,
    subscribeTo: "abandoned-checkouts",
  });

  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    if (realtimeStatus === "connected") {
      // Reconcile once after connect/reconnect so a brief disconnect cannot lose an update.
      syncLeads();
      return undefined;
    }
    const syncIfVisible = () => {
      if (document.visibilityState === "visible") syncLeads();
    };
    const timer = window.setInterval(syncIfVisible, 60000);
    window.addEventListener("focus", syncIfVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncIfVisible);
    };
  }, [realtimeStatus, syncLeads]);

  const copyPhone = async (phone) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("ফোন নম্বর কপি হয়েছে।");
    } catch {
      toast.error("নম্বর কপি করা যায়নি।");
    }
  };

  const removeLead = (lead) => {
    if (!window.confirm(`${lead.customerName || lead.phoneNumber} -এর abandoned checkout মুছবেন?`)) return;
    setPendingId(lead.id);
    startTransition(async () => {
      const result = await deleteAbandonedCheckoutLeadAction(lead.id);
      if (result?.success) {
        setLeads((current) => current.filter((item) => item.id !== lead.id));
        toast.success("লিডটি মুছে ফেলা হয়েছে।");
      } else toast.error("লিডটি মোছা যায়নি।");
      setPendingId(null);
    });
  };

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold text-text-primary">অসম্পূর্ণ Checkout</h1><p className="mt-1 text-sm text-text-muted">যারা ফোন নম্বর দিয়ে checkout শুরু করেছেন, কিন্তু order করেননি।</p><p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-text-muted"><span className={`h-1.5 w-1.5 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"}`} />{realtimeStatus === "connected" ? "লাইভ আপডেট চালু" : realtimeStatus === "unavailable" ? "লাইভ সংযোগ নেই · ৬০ সেকেন্ডে sync" : "লাইভ সংযোগ হচ্ছে · ৬০ সেকেন্ডে sync"}</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{leads.length} জন</span><button type="button" onClick={syncLeads} className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted">Refresh</button></div>
      </header>
      <label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="নাম, ফোন, জেলা বা পণ্য খুঁজুন" className="min-h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
      {filtered.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((lead) => (
        <article key={lead.id} className="rounded-xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold text-text-primary">{lead.customerName || "নাম দেওয়া হয়নি"}</h2><p className="mt-0.5 text-xs text-text-muted">শেষ activity · {relativeDate(lead.lastSeenAt || lead.updatedAt)}</p></div><span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">অর্ডার হয়নি</span></div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-surface-muted p-2.5"><Phone className="h-4 w-4 shrink-0 text-primary" /><a href={`tel:${digits(lead.phoneNumber)}`} className="min-w-0 flex-1 font-semibold text-primary">{lead.phoneNumber}</a><button type="button" onClick={() => copyPhone(lead.phoneNumber)} aria-label="ফোন নম্বর কপি" className="rounded-md p-1.5 hover:bg-surface"><Copy className="h-4 w-4" /></button></div>
          {(lead.district || lead.thana || lead.deliveryAddress) && <p className="mt-2 text-xs leading-5 text-text-muted">{[lead.deliveryAddress, lead.thana, lead.district].filter(Boolean).join(", ")}</p>}
          {lead.lastError && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-1">
                <p className="font-semibold text-text-primary">শেষ অর্ডার চেষ্টার সমস্যা</p>
                {lead.lastErrorAt && (
                  <time className="text-xs text-text-muted" dateTime={new Date(lead.lastErrorAt).toISOString()}>
                    {new Date(lead.lastErrorAt).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                  </time>
                )}
              </div>
              <p className="mt-1 break-words text-text-primary">{lead.lastError}</p>
            </div>
          )}
          {lead.items?.length > 0 && <div className="mt-3 border-t border-border pt-2"><p className="mb-1 text-[10px] font-semibold uppercase text-text-muted">কার্টে ছিল</p>{lead.items.slice(0, 3).map((item, index) => <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-2 text-xs">{item.productUrl ? <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary underline-offset-2 hover:underline">{item.name}</a> : <span className="min-w-0 truncate text-text-primary">{item.name}</span>}<span className="shrink-0 text-text-muted">×{item.quantity}{item.price != null && Number.isFinite(Number(item.price)) ? ` · ৳${Number(item.price).toLocaleString("en-BD")}` : ""}</span></div>)}{lead.items.length > 3 && <p className="mt-1 text-[10px] text-text-muted">আরও {lead.items.length - 3}টি পণ্য</p>}</div>}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3"><span className="text-[10px] text-text-muted">শুরু · {new Date(lead.createdAt).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" })}</span><div className="flex items-center gap-1">{canDelete && <button type="button" onClick={() => setActiveLead(lead)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90"><Plus className="h-3.5 w-3.5" />Create order</button>}{canDelete && <button type="button" disabled={isPending && pendingId === lead.id} onClick={() => removeLead(lead)} aria-label="লিড মুছুন" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" />মুছুন</button>}</div></div>
        </article>
      ))}</div> : <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-sm text-text-muted">{leads.length ? "এই খোঁজে কোনো lead পাওয়া যায়নি।" : "এখনো কোনো অসম্পূর্ণ checkout নেই।"}</div>}
      {activeLead && <AbandonedCheckoutOrderModal lead={activeLead} onClose={() => setActiveLead(null)} onCreated={(leadId) => { setLeads((current) => current.filter((item) => item.id !== leadId)); setActiveLead(null); }} />}
    </section>
  );
}
