"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Imagecustom from "@/components/images/ImageCustom";
import { Bell, BellOff, CalendarDays, Copy, ListFilter, Phone, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getRecentOrdersForAdmin, markOrderViewedAction, updateOrderStatusAction } from "@/backend/serverActions/orderActions";

const PAGE_SIZE = 50;
const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD")}`;
const date = (value) => new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
const statusStyle = {
  PENDING: "bg-amber-100 text-amber-800", PROCESSING: "bg-blue-100 text-blue-800",
  READY_TO_SHIP: "bg-indigo-100 text-indigo-800", SHIPPED: "bg-violet-100 text-violet-800",
  DELIVERED: "bg-emerald-100 text-emerald-800", CANCELLED: "bg-rose-100 text-rose-800",
  DELIVERY_FAILED: "bg-orange-100 text-orange-800",
};
const statuses = ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "DELIVERY_FAILED", "CANCELLED"];

function isInDateRange(value, filter) {
  if (filter === "ALL") return true;
  const dateValue = new Date(value);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (filter === "YESTERDAY") start.setDate(start.getDate() - 1);
  if (filter === "THIS_WEEK") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  }
  const end = new Date(start);
  if (filter === "TODAY") end.setDate(end.getDate() + 1);
  else if (filter === "YESTERDAY") end.setDate(end.getDate() + 1);
  else end.setDate(end.getDate() + 7);
  return dateValue >= start && dateValue < end;
}

export default function Orders2Client({ initialOrders, initialHasMore, canUpdate, viewerId }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders || []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [viewedIds, setViewedIds] = useState(() => new Set((initialOrders || []).filter((order) => order.viewedBy?.includes(viewerId)).map((order) => order.id)));
  const knownIds = useRef(new Set((initialOrders || []).map((order) => order.id)));
  const firstPoll = useRef(true);

  const notificationPreferenceKey = `orders2-notifications:${viewerId || "admin"}`;

  useEffect(() => {
    try {
      const savedPreference = window.localStorage.getItem(notificationPreferenceKey);
      const canNotify = "Notification" in window && Notification.permission === "granted";
      if (savedPreference === "true" && canNotify) setNotificationsEnabled(true);
      else if (savedPreference === "false") setNotificationsEnabled(false);
      else if (canNotify) {
        setNotificationsEnabled(true);
        window.localStorage.setItem(notificationPreferenceKey, "true");
      }
    } catch { /* Browser storage may be unavailable. */ }
  }, [notificationPreferenceKey]);
  const markViewed = useCallback((orderId) => {
    setViewedIds((current) => new Set(current).add(orderId));
    markOrderViewedAction(orderId).then((result) => {
      if (!result?.success) toast.error(result?.message || "অর্ডার দেখা হিসেবে সংরক্ষণ হয়নি।");
    }).catch(() => toast.error("অর্ডার দেখা হিসেবে সংরক্ষণ হয়নি।"));
  }, []);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getRecentOrdersForAdmin({ limit: PAGE_SIZE });
      const latest = result.orders || [];
      const newOrders = latest.filter((order) => !knownIds.current.has(order.id));
      latest.forEach((order) => knownIds.current.add(order.id));
      setOrders((current) => {
        const merged = new Map(latest.map((order) => [order.id, order]));
        current.forEach((order) => { if (!merged.has(order.id)) merged.set(order.id, order); });
        return [...merged.values()];
      });
      setHasMore((current) => current || result.hasMore);
      if (!firstPoll.current && newOrders.length) {
        newOrders.slice().reverse().forEach((order) => {
          toast.info(`নতুন অর্ডার #${order.orderNo} · ${order.customerName}`);
          if (notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
            const notification = new Notification(`নতুন অর্ডার #${order.orderNo}`, {
              body: `${order.customerName} · ${money(order.orderPrice + (order.deliveryCharge || 0))}`,
              tag: `order-${order.id}`,
            });
            notification.onclick = () => { markViewed(order.id); window.focus(); window.location.href = `/admin/orders2/${order.id}`; };
          }
        });
      }
      firstPoll.current = false;
    } catch {
      toast.error("অর্ডার আপডেট আনা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setRefreshing(false);
    }
  }, [notificationsEnabled, markViewed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 12000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !orders.length) return;
    setLoadingMore(true);
    try {
      const result = await getRecentOrdersForAdmin({ limit: PAGE_SIZE, cursorId: orders[orders.length - 1].id });
      const newRows = (result.orders || []).filter((order) => !knownIds.current.has(order.id));
      newRows.forEach((order) => knownIds.current.add(order.id));
      setOrders((current) => [...current, ...newRows]);
      setHasMore(Boolean(result.hasMore));
    } catch {
      toast.error("আরও অর্ডার আনা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      try { window.localStorage.setItem(notificationPreferenceKey, "false"); } catch { /* Toggle still applies until this page closes. */ }
      toast.success("নতুন অর্ডারের নোটিফিকেশন বন্ধ করা হয়েছে।");
      return;
    }
    if (!("Notification" in window)) {
      toast.info("এই ব্রাউজারে নোটিফিকেশন সমর্থিত নয়।");
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    const enabled = permission === "granted";
    setNotificationsEnabled(enabled);
    try { window.localStorage.setItem(notificationPreferenceKey, String(enabled)); } catch { /* Toggle still applies until this page closes. */ }
    toast[enabled ? "success" : "info"](enabled ? "নতুন অর্ডারের নোটিফিকেশন চালু হয়েছে।" : "ব্রাউজার নোটিফিকেশনের অনুমতি পাওয়া যায়নি।");
  };
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const text = `${order.orderNo} ${order.customerName} ${order.phoneNumber}`.toLowerCase();
    return (statusFilter === "ALL" || order.status === statusFilter) && text.includes(query.toLowerCase()) && isInDateRange(order.createdAt, dateFilter);
  }), [orders, query, statusFilter, dateFilter]);

  const openOrderFromCard = (event, order) => {
    if (event.target.closest("a, button, select, input, textarea, label")) return;
    markViewed(order.id);
    router.push(`/admin/orders2/${order.id}`);
  };

  const copyPhone = async (phoneNumber) => {
    try {
      await navigator.clipboard.writeText(String(phoneNumber || ""));
      toast.success("ফোন নম্বর কপি হয়েছে।");
    } catch {
      toast.error("ফোন নম্বর কপি করা যায়নি।");
    }
  };

  const changeStatus = async (order, status) => {
    const result = await updateOrderStatusAction(order.id, status);
    if (!result?.success) { toast.error(result?.message || "স্ট্যাটাস আপডেট হয়নি।"); return; }
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item));
    toast.success(`অর্ডার #${order.orderNo} ${status} করা হয়েছে।`);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-3 p-1 sm:p-2">
      <header className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold text-text-primary">অর্ডার ২ · Live</h1><p className="text-xs text-text-muted">প্রতি ১২ সেকেন্ডে আপডেট · <span className="font-semibold text-amber-700">হালকা হলুদ = দেখা হয়নি</span> · <span className="font-semibold text-emerald-700">সবুজ = দেখা হয়েছে</span></p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={toggleNotifications} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted">{notificationsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}{notificationsEnabled ? "নোটিফিকেশন বন্ধ করুন" : "নোটিফিকেশন চালু করুন"}</button>
          <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-white disabled:opacity-60"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />রিফ্রেশ</button>
        </div>
      </header>
      <div className="sticky top-16 z-20 -mx-1 px-1 py-2 sm:-mx-2 sm:px-2">
        <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-border/80 bg-surface/95 p-2 shadow-lg shadow-black/5 backdrop-blur sm:grid-cols-[minmax(220px,1fr)_190px_180px] sm:p-3">
          <label className="group relative col-span-2 block sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-primary" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="অর্ডার, কাস্টমার বা ফোন খুঁজুন" aria-label="অর্ডার খুঁজুন" className="min-h-11 w-full rounded-xl border border-border/70 bg-surface-muted/40 pl-9 pr-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary/60 focus:bg-surface focus:ring-2 focus:ring-primary/15" />
          </label>
          <label className="relative block">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="তারিখ দিয়ে ফিল্টার" className="min-h-11 w-full appearance-none rounded-xl border border-border/70 bg-surface-muted/40 pl-9 pr-8 text-sm text-text-primary outline-none transition hover:bg-surface-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/15">
              <option value="ALL">সব তারিখ</option><option value="TODAY">আজ</option><option value="YESTERDAY">গতকাল</option><option value="THIS_WEEK">এই সপ্তাহ</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">⌄</span>
          </label>
          <label className="relative block">
            <ListFilter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="স্ট্যাটাস দিয়ে ফিল্টার" className="min-h-11 w-full appearance-none rounded-xl border border-border/70 bg-surface-muted/40 pl-9 pr-8 text-sm text-text-primary outline-none transition hover:bg-surface-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/15">
              <option value="ALL">সব স্ট্যাটাস</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">⌄</span>
          </label>
        </div>
      </div>
      <p className="text-xs text-text-muted">{filteredOrders.length}টি দেখানো · মোট লোড হয়েছে {orders.length}টি</p>
      {filteredOrders.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-text-muted">কোনো অর্ডার পাওয়া যায়নি।</div> : <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {filteredOrders.map((order) => {
          const viewed = order.viewedBy?.includes(viewerId) || viewedIds.has(order.id);
          return <article key={order.id} role="link" tabIndex={0} onClick={(event) => openOrderFromCard(event, order)} onKeyDown={(event) => { if (event.key === "Enter") openOrderFromCard(event, order); }} className={`flex min-w-0 cursor-pointer flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md ${viewed ? "border-emerald-200 bg-emerald-50/60" : "border-amber-300 bg-amber-50"}`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">#{order.orderNo} · {order.customerName}</p><p className="text-[10px] text-text-muted">{date(order.createdAt)}</p></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[order.status] || "bg-slate-100 text-slate-700"}`}>{order.status?.replaceAll("_", " ")}</span></div>
            <div className="mt-2 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1"><a className="truncate text-xs font-medium text-primary" href={`tel:${order.phoneNumber}`} aria-label="Call customer"><Phone className="mr-1 inline h-3.5 w-3.5" />{order.phoneNumber}</a><button type="button" onClick={() => copyPhone(order.phoneNumber)} title="নম্বর কপি" aria-label="Copy phone number" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-white/70"><Copy className="h-3.5 w-3.5" /></button></div><span className="shrink-0 text-sm font-bold text-text-primary">{money(order.orderPrice + (order.deliveryCharge || 0))}</span></div>
            <div className="mt-2 space-y-1 border-t border-black/5 pt-2">{(order.orderItems || []).slice(0, 2).map((item) => <div key={item.id} className="flex min-w-0 items-center gap-2 text-xs"><div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-white">{item.thumbnail ? <Imagecustom src={item.thumbnail} alt={item.productName || "পণ্য"} w={36} h={36} sizes="36px" imageClassName="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[8px] text-text-muted">ছবি নেই</div>}</div><span className="line-clamp-1 min-w-0 flex-1 text-text-primary">{item.productName} <span className="text-text-muted">×{item.quantity}</span></span></div>)}{order.orderItems?.length > 2 && <p className="pl-10 text-[10px] text-text-muted">আরও {order.orderItems.length - 2}টি পণ্য</p>}</div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-black/5 pt-2"><span className="text-[10px] text-text-muted">{viewed ? "দেখা হয়েছে" : "নতুন · দেখা হয়নি"}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${order.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-800" : order.paymentStatus === "PARTIALLY_PAID" ? "bg-orange-100 text-orange-800" : "bg-rose-100 text-rose-800"}`}>{order.paymentStatus === "PAID" ? "পেমেন্ট সম্পন্ন" : order.paymentStatus === "PARTIALLY_PAID" ? `আংশিক · জমা ${money(order.paidAmount)}` : order.paymentStatus === "FAILED" ? "পেমেন্ট ব্যর্থ" : "পেমেন্ট বাকি"}</span></div>
            {canUpdate && <div className="mt-1.5 flex items-center gap-2"><label htmlFor={`status-${order.id}`} className="text-[10px] text-text-muted">স্ট্যাটাস</label><select id={`status-${order.id}`} value={order.status} onChange={(event) => changeStatus(order, event.target.value)} className="min-h-8 min-w-0 flex-1 rounded-lg border border-border bg-white/80 px-2 text-[10px]"><option value={order.status}>{order.status?.replaceAll("_", " ")}</option>{statuses.filter((status) => status !== order.status).map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></div>}
          </article>;
        })}
      </div>}
      {hasMore && <div className="flex justify-center py-2"><button type="button" onClick={loadMore} disabled={loadingMore} className="min-h-10 rounded-lg border border-border bg-surface px-5 text-sm font-semibold text-primary hover:bg-surface-muted disabled:opacity-60">{loadingMore ? "লোড হচ্ছে…" : "আরও অর্ডার দেখুন"}</button></div>}
    </section>
  );
}
