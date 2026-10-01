"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Imagecustom from "@/components/images/ImageCustom";
import { Bell, BellOff, CalendarDays, Copy, ListFilter, Phone, RefreshCw, Search } from "lucide-react";
import { toast } from "react-toastify";
import { getRecentOrdersForAdmin, markOrderViewedAction, updateOrderStatusAction } from "@/backend/serverActions/orderActions";
import { createOrderRealtimeToken, getOrderPushConfig, getOrderCardForAdminAction, saveOrderPushSubscriptionAction, removeOrderPushSubscriptionAction, sendOrderPushTestAction } from "@/backend/serverActions/realtimeActions";
import { useRealtimeConnection } from "@/hooks/useRealtimeConnection";
import { OrderRiskBadge } from "../orders/_components/OrderRiskAssessment";
import CustomerOrderHistoryButton from "../orders/_components/CustomerOrderHistoryButton";

const PAGE_SIZE = 50;
function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function subscriptionUsesVapidKey(subscription, publicKey) {
  const currentKey = subscription?.options?.applicationServerKey;
  if (!currentKey || !publicKey) return false;
  const expected = urlBase64ToUint8Array(publicKey);
  const current = new Uint8Array(currentKey);
  return current.length === expected.length && current.every((byte, index) => byte === expected[index]);
}
const money = (value) => `৳${Number(value || 0).toLocaleString("en-BD")}`;
const date = (value) => new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
const relativeTime = (value) => {
  const ageMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  const number = (amount) => amount.toLocaleString("bn-BD");
  if (ageMinutes < 1) return "এইমাত্র";
  if (ageMinutes < 60) return `${number(ageMinutes)} মিনিট আগে`;
  const ageHours = Math.floor(ageMinutes / 60);
  if (ageHours < 24) return `${number(ageHours)} ঘণ্টা আগে`;
  const ageDays = Math.floor(ageHours / 24);
  return `${number(ageDays)} দিন আগে`;
};
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

export default function Orders2Client({ initialOrders, initialHasMore, initialUnseenCount = 0, canUpdate, viewerId }) {
  const router = useRouter();
  const [orders, setOrders] = useState(initialOrders || []);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(Boolean(initialHasMore));
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [pushReady, setPushReady] = useState(false);
  const [viewedIds, setViewedIds] = useState(() => new Set((initialOrders || []).filter((order) => order.viewedBy?.includes(viewerId)).map((order) => order.id)));
  const [unseenCount, setUnseenCount] = useState(initialUnseenCount);
  const viewedOrderIds = useRef(new Set((initialOrders || []).filter((order) => order.viewedBy?.includes(viewerId)).map((order) => order.id)));
  const unseenOrderIds = useRef(new Set((initialOrders || []).filter((order) => !order.viewedBy?.includes(viewerId)).map((order) => order.id)));
  const knownIds = useRef(new Set((initialOrders || []).map((order) => order.id)));
  const firstPoll = useRef(true);
  const statusRequest = useRef(0);
  const testPushReceived = useRef(false);

  const notificationPreferenceKey = `orders2-notifications:${viewerId || "admin"}`;

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const syncPushSubscription = async () => {
      try {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const registration = await navigator.serviceWorker.getRegistration("/");
        if (!registration) return;
        await registration.update();
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        const config = await getOrderPushConfig();
        if (!subscriptionUsesVapidKey(subscription, config?.publicKey)) return;
        const saved = await saveOrderPushSubscriptionAction(subscription.toJSON());
        if (active && saved?.success) {
          setPushReady(true);
          setNotificationsEnabled(true);
        }
      } catch {
        // The notification button lets the user retry registration.
      }
    };
    syncPushSubscription();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      const savedPreference = window.localStorage.getItem(notificationPreferenceKey);
      if (savedPreference === "true") setNotificationsEnabled(true);
    } catch { /* Browser storage may be unavailable. */ }
  }, [notificationPreferenceKey]);
  const markViewed = useCallback((orderId) => {
    setViewedIds((current) => new Set(current).add(orderId));
    viewedOrderIds.current.add(orderId);
    if (unseenOrderIds.current.delete(orderId)) {
      setUnseenCount((current) => Math.max(0, current - 1));
    }
    markOrderViewedAction(orderId).catch(() => toast.error("অর্ডার দেখা হিসেবে সংরক্ষণ হয়নি।"));
  }, []);
  const pendingOrderAlerts = useRef(new Map());
  const showNewOrderAlert = useCallback((order) => {
    if (!order?.id) return;
    const alerts = pendingOrderAlerts.current;
    alerts.set(order.id, order);
    const count = alerts.size;
    const latestOrder = order;
    const toastId = "orders2-new-orders";
    const message = count === 1
      ? `নতুন অর্ডার #${order.orderNo} · ${order.customerName} · ${money(order.orderPrice + (order.deliveryCharge || 0))}`
      : `${count.toLocaleString("bn-BD")}টি নতুন অর্ডার এসেছে · সর্বশেষ #${order.orderNo}`;
    const options = {
      position: "top-center",
      autoClose: 10000,
      pauseOnHover: true,
      pauseOnFocusLoss: true,
      onClick: () => {
        markViewed(latestOrder.id);
        router.push(`/admin/orders2/${latestOrder.id}`);
      },
      onClose: () => alerts.clear(),
    };
    if (toast.isActive(toastId)) toast.update(toastId, { render: message, ...options });
    else toast.info(message, { toastId, ...options });
  }, [markViewed, router]);
  const refresh = useCallback(async () => {
    const requestId = statusRequest.current;
    setRefreshing(true);
    try {
      const result = await getRecentOrdersForAdmin({ limit: PAGE_SIZE, status: statusFilter, includeUnseenCount: true });
      if (requestId !== statusRequest.current) return;
      const latest = result.orders || [];
      const newOrders = latest.filter((order) => !knownIds.current.has(order.id));
      latest.forEach((order) => {
        if (order.viewedBy?.includes(viewerId)) {
          viewedOrderIds.current.add(order.id);
          unseenOrderIds.current.delete(order.id);
        } else if (!viewedOrderIds.current.has(order.id)) {
          unseenOrderIds.current.add(order.id);
        }
      });
      if (typeof result.unseenCount === "number") setUnseenCount(result.unseenCount);
      latest.forEach((order) => knownIds.current.add(order.id));
      setOrders((current) => {
        const merged = new Map(latest.map((order) => [order.id, order]));
        current.filter((order) => statusFilter === "ALL" || order.status === statusFilter).forEach((order) => { if (!merged.has(order.id)) merged.set(order.id, order); });
        return [...merged.values()];
      });
      setHasMore((current) => current || result.hasMore);
      if (!firstPoll.current && newOrders.length && notificationsEnabled) {
        newOrders.slice().reverse().forEach(showNewOrderAlert);
      }
      firstPoll.current = false;
    } catch {
      toast.error("অর্ডার আপডেট আনা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      if (requestId === statusRequest.current) setRefreshing(false);
    }
  }, [notificationsEnabled, showNewOrderAlert, statusFilter, viewerId]);

  const handleRealtimeEvent = useCallback((event, payload) => {
    if (event === "realtime:connected") return;
    if (event !== "order.created" || !payload?.id) return;
    if (knownIds.current.has(payload.id)) return;
    knownIds.current.add(payload.id);
    if (!viewedOrderIds.current.has(payload.id) && !unseenOrderIds.current.has(payload.id)) {
      unseenOrderIds.current.add(payload.id);
      setUnseenCount((current) => current + 1);
    }
    if (statusFilter !== "ALL" && payload.status !== statusFilter) return;
    setOrders((current) => [payload, ...current.filter((order) => order.id !== payload.id)]);
    refresh();
    if (notificationsEnabled) showNewOrderAlert(payload);
  }, [notificationsEnabled, refresh, showNewOrderAlert, statusFilter, viewerId]);
  const realtimeStatus = useRealtimeConnection({ enabled: true, getAccessToken: createOrderRealtimeToken, onEvent: handleRealtimeEvent });

  useEffect(() => {
    if (realtimeStatus === "connected") refresh();
  }, [realtimeStatus, refresh]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    let timer;
    if (realtimeStatus !== "connected") {
      timer = window.setInterval(() => {
        if (document.visibilityState === "visible") refresh();
      }, 30000);
    }
    return () => { if (timer) window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh, realtimeStatus]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return undefined;
    const onWorkerMessage = async (event) => {
      if (event.data?.type === "order-push-test") {
        if (event.data.stage === "received") testPushReceived.current = true;
        if (event.data.stage === "received") toast.info("এই Chrome-এর service worker test push পেয়েছে।", { toastId: "push-test-received", autoClose: 10000 });
        if (event.data.stage === "shown") toast.success("Browser notification API সফল হয়েছে। Windows notification settings দেখুন যদি banner না আসে।", { toastId: "push-test-shown", autoClose: 10000 });
        if (event.data.stage === "failed") toast.error("Service worker browser notification দেখাতে পারেনি।", { toastId: "push-test-failed", autoClose: 10000 });
        return;
      }
      if (event.data?.type !== "order-push" || !event.data.orderId) return;
      if (knownIds.current.has(event.data.orderId)) return;
      const result = await getOrderCardForAdminAction(event.data.orderId);
      const order = result?.data;
      if (!order || (statusFilter !== "ALL" && order.status !== statusFilter) || knownIds.current.has(order.id)) return;
      knownIds.current.add(order.id);
      setOrders((current) => [order, ...current]);
      refresh();
      if (notificationsEnabled) showNewOrderAlert(order);
    };
    navigator.serviceWorker.addEventListener("message", onWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onWorkerMessage);
  }, [notificationsEnabled, refresh, showNewOrderAlert, statusFilter, viewerId]);

  const loadMore = async () => {
    if (!hasMore || loadingMore || !orders.length) return;
    const requestId = statusRequest.current;
    setLoadingMore(true);
    try {
      const result = await getRecentOrdersForAdmin({ limit: PAGE_SIZE, cursorId: orders[orders.length - 1].id, status: statusFilter, includeUnseenCount: true });
      if (requestId !== statusRequest.current) return;
      const newRows = (result.orders || []).filter((order) => !knownIds.current.has(order.id));
      newRows.forEach((order) => {
        if (order.viewedBy?.includes(viewerId)) viewedOrderIds.current.add(order.id);
        else if (!viewedOrderIds.current.has(order.id)) unseenOrderIds.current.add(order.id);
      });
      if (typeof result.unseenCount === "number") setUnseenCount(result.unseenCount);
      newRows.forEach((order) => knownIds.current.add(order.id));
      setOrders((current) => [...current, ...newRows]);
      setHasMore(Boolean(result.hasMore));
    } catch {
      toast.error("আরও অর্ডার আনা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      if (requestId === statusRequest.current) setLoadingMore(false);
    }
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    try {
      const registration = await navigator.serviceWorker?.getRegistration("/");
      const subscription = await registration?.pushManager?.getSubscription();
      if (!subscription || Notification.permission !== "granted") throw new Error("এই Chrome-এর push subscription নেই। নোটিফিকেশন আবার চালু করুন।");
      const result = await sendOrderPushTestAction(subscription.endpoint);
      if (!result?.success) throw new Error(result?.message || "Test push পাঠানো যায়নি।");
      toast.info("এই Chrome-এর endpoint-এ push provider request গ্রহণ করেছে। worker-এর ফল দেখুন।", { position: "top-center", autoClose: 10000 });
      window.setTimeout(() => {
        if (!testPushReceived.current) toast.error("Server push গ্রহণ করেছে, কিন্তু এই Chrome-এর service worker push পায়নি।", { position: "top-center", autoClose: 15000 });
      }, 15000);
    } catch (error) {
      toast.error(error?.message || "Test push পাঠানো যায়নি।", { position: "top-center", autoClose: 10000 });
    } finally {
      setTestingPush(false);
    }
  };
  const toggleNotifications = async () => {
    if (pushReady) {
      setNotificationsEnabled(false);
      setPushReady(false);
      try {
        window.localStorage.setItem(notificationPreferenceKey, "false");
        const registration = await navigator.serviceWorker?.getRegistration("/");
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) {
          await removeOrderPushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
        }
      } catch { /* In-page alerts still turn off if push cleanup is unavailable. */ }
      toast.success("নতুন অর্ডারের নোটিফিকেশন বন্ধ করা হয়েছে।");
      return;
    }

    const permissionRequest = "Notification" in window
      ? (Notification.permission === "granted" ? Promise.resolve("granted") : Notification.requestPermission())
      : Promise.resolve("unsupported");
    setNotificationsEnabled(true);
    try { window.localStorage.setItem(notificationPreferenceKey, "true"); } catch { /* Toggle still applies until this page closes. */ }
    try {
      const config = await getOrderPushConfig();
      const canPush = Boolean(config?.publicKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
      if (!canPush) {
        toast.info(/iPhone|iPad|iPod/i.test(navigator.userAgent) && !window.navigator.standalone
          ? "iPhone-এ push পেতে Share → Add to Home Screen করে app খুলুন। আপাতত পেজ খোলা থাকলে alert আসবে।"
          : "Push সেটআপ পাওয়া যায়নি। Orders2 খোলা থাকলে alert আসবে।", { position: "top-center", autoClose: 10000 });
        return;
      }
      const permission = await permissionRequest;
      if (permission !== "granted") {
        toast.info("ব্রাউজার অনুমতি দেয়নি। পেজ খোলা থাকলে alert আসবে।", { position: "top-center", autoClose: 8000 });
        return;
      }
      const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
      let existing = await registration.pushManager.getSubscription();
      if (existing && !subscriptionUsesVapidKey(existing, config.publicKey)) {
        await removeOrderPushSubscriptionAction(existing.endpoint);
        await existing.unsubscribe();
        existing = null;
      }
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) });
      const saved = await saveOrderPushSubscriptionAction(subscription.toJSON());
      if (!saved?.success) throw new Error(saved?.message || "Push subscription save failed.");
      setPushReady(true);
      toast.success("এই ডিভাইসে নতুন অর্ডারের push notification চালু হয়েছে।", { position: "top-center", autoClose: 8000 });
    } catch (error) {
      toast.info(error?.message || "Push চালু হয়নি। Orders2 পেজ খোলা থাকলে alert আসবে।", { position: "top-center", autoClose: 10000 });
    }
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

  const changeStatusFilter = async (nextStatus) => {
    setStatusFilter(nextStatus);
    const requestId = ++statusRequest.current;
    setLoadingMore(false);
    setRefreshing(true);
    try {
      const result = await getRecentOrdersForAdmin({ limit: PAGE_SIZE, status: nextStatus, includeUnseenCount: true });
      if (requestId !== statusRequest.current) return;
      setOrders(result.orders || []);
      (result.orders || []).forEach((order) => {
        if (order.viewedBy?.includes(viewerId)) {
          viewedOrderIds.current.add(order.id);
          unseenOrderIds.current.delete(order.id);
        } else if (!viewedOrderIds.current.has(order.id)) {
          unseenOrderIds.current.add(order.id);
        }
      });
      if (typeof result.unseenCount === "number") setUnseenCount(result.unseenCount);
      setHasMore(Boolean(result.hasMore));
      knownIds.current = new Set((result.orders || []).map((order) => order.id));
      firstPoll.current = true;
    } catch {
      if (requestId === statusRequest.current) toast.error("স্ট্যাটাস অনুযায়ী অর্ডার আনা যায়নি।");
    } finally {
      if (requestId === statusRequest.current) setRefreshing(false);
    }
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
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status } : item).filter((item) => statusFilter === "ALL" || item.status === statusFilter));
    toast.success(`অর্ডার #${order.orderNo} ${status} করা হয়েছে।`);
  };

  return (
    <section className="mx-auto max-w-7xl space-y-3 p-1 sm:p-2">
      <header className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-text-primary">অর্ডার ২ · Live</h1><span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{unseenCount.toLocaleString("bn-BD")}টি দেখা হয়নি</span></div><p className="text-xs text-text-muted"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${realtimeStatus === "connected" ? "bg-emerald-500" : "bg-amber-500"}`} />{realtimeStatus === "connected" ? "লাইভ সংযুক্ত" : "লাইভ সংযোগ হচ্ছে · ব্যাকআপ refresh ৩০ সেকেন্ডে"}</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={sendTestPush} disabled={testingPush || !pushReady} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50">{testingPush ? "টেস্ট হচ্ছে…" : "টেস্ট পুশ"}</button>
          <button type="button" onClick={toggleNotifications} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted">{pushReady ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}{pushReady ? "নোটিফিকেশন বন্ধ করুন" : "নোটিফিকেশন চালু করুন"}</button>
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
            <select value={statusFilter} onChange={(event) => changeStatusFilter(event.target.value)} aria-label="স্ট্যাটাস দিয়ে ফিল্টার" className="min-h-11 w-full appearance-none rounded-xl border border-border/70 bg-surface-muted/40 pl-9 pr-8 text-sm text-text-primary outline-none transition hover:bg-surface-muted/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/15">
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
          return <article key={order.id} role="link" tabIndex={0} onClick={(event) => openOrderFromCard(event, order)} onPointerEnter={() => router.prefetch(`/admin/orders2/${order.id}`)} onTouchStart={() => router.prefetch(`/admin/orders2/${order.id}`)} onKeyDown={(event) => { if (event.key === "Enter") openOrderFromCard(event, order); }} className={`flex min-w-0 cursor-pointer flex-col rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md ${viewed ? "border-border bg-surface" : "border-primary/35 bg-primary/5"}`}>
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">#{order.orderNo} · {order.customerName}</p><div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]"><span className="text-text-muted">{date(order.createdAt)}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-1.5 py-0.5 font-semibold text-primary ring-1 ring-primary/10"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{relativeTime(order.createdAt)}</span></div></div><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[order.status] || "bg-slate-100 text-slate-700"}`}>{order.status?.replaceAll("_", " ")}</span></div>
            <div className="mt-2 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1"><a className="truncate text-xs font-medium text-primary" href={`tel:${order.phoneNumber}`} aria-label="Call customer"><Phone className="mr-1 inline h-3.5 w-3.5" />{order.phoneNumber}</a><button type="button" onClick={() => copyPhone(order.phoneNumber)} title="নম্বর কপি" aria-label="Copy phone number" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-white/70"><Copy className="h-3.5 w-3.5" /></button></div><span className="shrink-0 text-sm font-bold text-text-primary">{money(order.orderPrice + (order.deliveryCharge || 0))}</span></div>
            <div className="mt-1"><OrderRiskBadge score={order.fraudRiskScore} level={order.fraudRiskLevel} compact /></div>
            <div className="mt-1.5"><CustomerOrderHistoryButton phoneNumber={order.phoneNumber} /></div>
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
