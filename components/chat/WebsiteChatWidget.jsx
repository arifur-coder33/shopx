"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check, CheckCheck, CircleAlert, LoaderCircle, MessageCircle, Minus, Plus, RotateCw, Send, X, ShoppingBag } from "lucide-react";

const TOKEN_KEY = "storefront-chat-visitor";
const PHONE_KEY = "storefront-chat-phone";

function getToken() {
  try {
    let token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      sessionStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch {
    return crypto.randomUUID();
  }
}

function playGreetingTone() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return false;
  const context = new AudioContextClass();
  if (context.state !== "running") {
    context.close().catch(() => {});
    return false;
  }
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(1174, context.currentTime + 0.09);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22);
  oscillator.connect(gain); gain.connect(context.destination);
  oscillator.start(); oscillator.stop(context.currentTime + 0.23);
  oscillator.onended = () => context.close().catch(() => {});
  return true;
}

export default function WebsiteChatWidget() {
  const [enabled, setEnabled] = useState(false);
  const [identity, setIdentity] = useState(null);
  const [identityLoaded, setIdentityLoaded] = useState(false);
  const [welcome, setWelcome] = useState("আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?");
  const [open, setOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState("default");
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [orderNo, setOrderNo] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [ordersBusy, setOrdersBusy] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [orderShareNotice, setOrderShareNotice] = useState("");
  const [sharingOrderId, setSharingOrderId] = useState("");
  const endRef = useRef(null);
  const openRef = useRef(false);
  const knownMessageIdsRef = useRef(null);
  openRef.current = open;

  useEffect(() => {
    setToken(getToken());
    try { const savedPhone = sessionStorage.getItem(PHONE_KEY) || ""; setPhone(savedPhone); setOrderPhone(savedPhone); } catch {}
    fetch("/api/chat/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config) => { setEnabled(Boolean(config.enabled)); setWelcome(config.welcomeMessage || welcome); setIdentity(config.customer || null); setIdentityLoaded(true); if (config.customer) { setName(config.customer.name || ""); setPhone(config.customer.phone || ""); setOrderPhone(config.customer.phone || ""); } })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    try { if (sessionStorage.getItem("storefront-chat-greeting-dismissed")) return; } catch {}
    const timer = window.setTimeout(() => {
      setGreetingVisible(true);
      let played = false;
      try { played = playGreetingTone(); } catch { /* Browser autoplay policies may block the greeting sound. */ }
      if (!played) {
        const playAfterGesture = () => {
          try { if (playGreetingTone()) { window.removeEventListener("pointerdown", playAfterGesture); window.removeEventListener("keydown", playAfterGesture); } } catch {}
        };
        window.addEventListener("pointerdown", playAfterGesture, { once: true });
        window.addEventListener("keydown", playAfterGesture, { once: true });
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/chat/website?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.success && result.data?.messages) setMessages(result.data.messages);
    } catch { /* Poll again on the next interval. */ }
  }, [token]);

  useEffect(() => {
    if (!open || !token) return;
    refreshMessages();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshMessages();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [open, token, refreshMessages]);

  useEffect(() => {
    if (!enabled || !token || !("Notification" in window)) return;
    let active = true;
    const checkForMessages = async () => {
      try {
        const response = await fetch(`/api/chat/website?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const result = await response.json();
        if (!active || !result.success || !Array.isArray(result.data?.messages)) return;
        const latestMessages = result.data.messages;
        const knownIds = knownMessageIdsRef.current;
        if (knownIds) {
          const newReplies = latestMessages.filter((message) => message.direction === "OUTBOUND" && !knownIds.has(message.id));
          if (!openRef.current && Notification.permission === "granted") {
            newReplies.forEach((message) => {
              const notification = new Notification("নতুন chat message", {
                body: message.content || (message.metadata?.type === "ORDER_TIMELINE" ? "আপনার order-এর update এসেছে" : "আপনার জন্য নতুন message এসেছে"),
                icon: "/favicon.ico",
                tag: `chat-${message.id}`,
              });
              notification.onclick = () => {
                window.focus();
                setOpen(true);
                notification.close();
              };
            });
          }
          latestMessages.forEach((message) => knownIds.add(message.id));
        } else {
          knownMessageIdsRef.current = new Set(latestMessages.map((message) => message.id));
        }
      } catch { /* Retry on the next poll. */ }
    };
    checkForMessages();
    const timer = window.setInterval(checkForMessages, 10000);
    return () => { active = false; window.clearInterval(timer); };
  }, [enabled, token]);

  useEffect(() => {
    if (!open || !token || !messages.some((message) => message.direction === "OUTBOUND" && message.deliveryStatus === "DELIVERED")) return;
    const timer = window.setTimeout(() => fetch("/api/chat/website/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => {}), 250);
    return () => window.clearTimeout(timer);
  }, [open, token, messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const content = text.trim();
    if (!content || busy || !token) return;
    const pendingId = `pending-${Date.now()}`;
    setBusy(true);
    setError("");
    setMessages((current) => [...current, { id: pendingId, direction: "INBOUND", content, createdAt: new Date().toISOString(), deliveryStatus: "SENDING" }]);
    setText("");
    try {
      const response = await fetch("/api/chat/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, content, name, phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "বার্তা পাঠানো যায়নি।");
      setMessages((current) => current.map((message) => message.id === pendingId ? result.data : message));
      refreshMessages();
    } catch (sendError) {
      setMessages((current) => current.map((message) => message.id === pendingId ? { ...message, deliveryStatus: "FAILED" } : message));
      setError(sendError.message || "বার্তা পাঠানো যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setBusy(false);
    }
  };

  const retryMessage = async (message) => {
    if (busy) return;
    setBusy(true); setError("");
    setMessages((current) => current.map((item) => item.id === message.id ? { ...item, deliveryStatus: "SENDING" } : item));
    try {
      const response = await fetch("/api/chat/website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, content: message.content, name, phone }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "বার্তা পাঠানো যায়নি।");
      setMessages((current) => current.map((item) => item.id === message.id ? result.data : item));
      refreshMessages();
    } catch (retryError) {
      setMessages((current) => current.map((item) => item.id === message.id ? { ...item, deliveryStatus: "FAILED" } : item));
      setError(retryError.message || "আবার পাঠানো যায়নি।");
    } finally { setBusy(false); }
  };

  const lookupOrders = async (event) => {
    event?.preventDefault();
    if (ordersBusy) return;
    setOrdersBusy(true); setOrdersError(""); setOrders([]);
    try {
      const response = await fetch("/api/chat/website/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNo, phone: orderPhone }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Order পাওয়া যায়নি।");
      setOrders(result.orders || []);
    } catch (lookupError) { setOrdersError(lookupError.message || "Order পাওয়া যায়নি।"); }
    finally { setOrdersBusy(false); }
  };

  const toggleOrders = () => {
    const nextOpen = !ordersOpen;
    setOrdersOpen(nextOpen); setOrdersError("");
    if (nextOpen && identity) lookupOrders();
    if (!nextOpen) setOrders([]);
  };

  const dismissGreeting = () => {
    setGreetingVisible(false);
    try { sessionStorage.setItem("storefront-chat-greeting-dismissed", "1"); } catch {}
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) { setNotificationPermission("unsupported"); return; }
    try { setNotificationPermission(await Notification.requestPermission()); }
    catch { setNotificationPermission(Notification.permission); }
  };

  const shareOrder = async (order) => {
    if (!identity || !token || sharingOrderId) return;
    setSharingOrderId(order.id); setOrderShareNotice(""); setOrdersError("");
    try {
      const response = await fetch("/api/chat/website/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "share", token, orderId: order.id }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Order chat-এ পাঠানো যায়নি।");
      setOrderShareNotice(`${order.orderNo} chat-এ পাঠানো হয়েছে।`);
      await refreshMessages();
    } catch (shareError) { setOrdersError(shareError.message || "Order chat-এ পাঠানো যায়নি।"); }
    finally { setSharingOrderId(""); }
  };

  if (!enabled) return null;
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-2 z-[70] flex flex-col items-end gap-3 sm:right-4 md:bottom-5 md:right-5">
      {open && (
        <section className="flex h-[min(42rem,calc(100dvh-7.5rem))] w-[min(26rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl sm:rounded-3xl" aria-label="Website chat">
          <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15"><MessageCircle size={21} /></span><div className="min-w-0"><h2 className="truncate font-bold">আমাদের সাথে কথা বলুন</h2><p className="flex items-center gap-1.5 text-xs text-white/85"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />LIVE · সাধারণত দ্রুত উত্তর দিই</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="চ্যাট বন্ধ করুন" className="rounded-full p-2 transition hover:bg-white/15"><X size={19} /></button>
          </header>
          <div className="flex flex-wrap items-center gap-2 border-b border-black/5 bg-[#f0f2f5] p-2"><button type="button" onClick={toggleOrders} aria-expanded={ordersOpen} aria-label={ordersOpen ? "Order list বন্ধ করুন" : "Order list খুলুন"} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary-soft"><ShoppingBag size={15} />আমার order<span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">{ordersOpen ? <Minus size={13} /> : <Plus size={13} />}</span></button>{notificationPermission !== "granted" && <button type="button" onClick={enableNotifications} disabled={notificationPermission === "unsupported" || notificationPermission === "denied"} title={notificationPermission === "denied" ? "Browser settings থেকে notification permission দিন" : notificationPermission === "unsupported" ? "এই browser notification সমর্থন করে না" : "নতুন chat message-এর notification চালু করুন"} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"><Bell size={14} />{notificationPermission === "denied" ? "Notification blocked" : notificationPermission === "unsupported" ? "Notification নেই" : "Notification চালু করুন"}</button>}</div>
          {ordersOpen && <section className="max-h-64 space-y-2 overflow-y-auto border-b border-border bg-background p-3" aria-label="আপনার order">
            {!identity && <form onSubmit={lookupOrders} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} maxLength={40} placeholder="Order number" aria-label="Order number" className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text" /><input value={orderPhone} onChange={(event) => setOrderPhone(event.target.value)} onBlur={() => { try { sessionStorage.setItem(PHONE_KEY, orderPhone); } catch {} }} type="tel" inputMode="tel" maxLength={30} placeholder="Order-এর phone number" aria-label="Order-এর phone number" className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text" /><button disabled={ordersBusy || !orderNo.trim() || orderPhone.replace(/\D/g, "").length < 10} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{ordersBusy ? "খুঁজছি…" : "খুঁজুন"}</button></form>}
            {identity && ordersBusy && <p className="text-xs text-text-muted">আপনার order খোঁজা হচ্ছে…</p>}
            {ordersError && <p role="alert" className="text-xs text-red-600">{ordersError}</p>}
            {orders.map((order) => <div key={order.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2"><details className="min-w-0 flex-1"><summary className="cursor-pointer text-xs font-semibold text-text">{order.orderNo} · {order.status} · ৳{Number(order.orderPrice).toLocaleString("en-BD")}</summary><div className="mt-2 space-y-2 border-t border-border pt-2 text-xs text-text-muted"><p>Order date: {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(new Date(order.createdAt))}</p>{order.orderItems.map((item, index) => <p key={`${item.productName}-${index}`}>{item.productName} × {item.quantity} · ৳{Number(item.price).toLocaleString("en-BD")}</p>)}<ol className="space-y-1 border-l border-border pl-3">{order.timeline.map((event, index) => <li key={`${event.status}-${index}`}><b className="text-text">{event.title}</b>{event.message ? ` · ${event.message}` : ""}<span className="ml-1">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</span></li>)}</ol></div></details>{identity && <button type="button" disabled={Boolean(sharingOrderId)} onClick={() => shareOrder(order)} aria-label={`${order.orderNo} chat-এ পাঠান`} title="এই order chat-এ পাঠান" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">{sharingOrderId === order.id ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}</button>}</div>)}
            {identity && !ordersBusy && !ordersError && !orders.length && <p className="text-xs text-text-muted">আপনার account-এ কোনো order পাওয়া যায়নি।</p>}
            {orderShareNotice && <p role="status" className="text-xs text-emerald-700">{orderShareNotice}</p>}
            {!identityLoaded && <p className="text-xs text-text-muted">অপেক্ষা করুন…</p>}
          </section>}
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-3 sm:p-4" aria-live="polite">
            <div className="mr-8 rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-800 shadow-sm">{welcome}</div>
            {messages.map((message) => <div key={message.id} className={`flex ${message.direction === "INBOUND" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${message.direction === "INBOUND" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900" : "rounded-tl-sm bg-white text-slate-800"}`}>{message.metadata?.type === "PRODUCT_CARD" && message.metadata.product && <a href={message.metadata.product.url} className="mb-2 block overflow-hidden rounded-xl bg-white text-gray-900" target="_blank" rel="noreferrer">{message.metadata.product.imageUrl && <img src={message.metadata.product.imageUrl} alt="" className="h-36 w-full object-cover" />}<span className="block p-2"><strong className="block text-sm">{message.metadata.product.title}</strong><span className="text-sm font-bold">৳{Number(message.metadata.product.price).toLocaleString("en-BD")}</span><span className="mt-1 block text-xs text-blue-700">পণ্য দেখুন →</span></span></a>}{message.metadata?.type === "ORDER_TIMELINE" && message.metadata.order && <div className="mb-1 rounded-xl bg-white p-3 text-gray-900"><strong className="block text-sm">অর্ডার {message.metadata.order.orderNo}</strong><p className="mt-1 text-xs">বর্তমান অবস্থা: {message.metadata.order.status}</p><ol className="mt-2 space-y-2 border-l border-gray-200 pl-3">{message.metadata.order.events.map((event, index) => <li key={`${event.status}-${index}`} className="text-xs"><b>{event.title}</b>{event.message ? ` · ${event.message}` : ""}{event.location ? ` · ${event.location}` : ""}<span className="mt-0.5 block text-[10px] text-gray-500">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</span></li>)}</ol></div>}{!['PRODUCT_CARD', 'ORDER_TIMELINE'].includes(message.metadata?.type) && <p className="whitespace-pre-wrap break-words">{message.content}</p>}{message.direction === "INBOUND" && message.deliveryStatus && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-600">{message.deliveryStatus === "SENDING" ? <LoaderCircle size={12} className="animate-spin" /> : message.deliveryStatus === "FAILED" ? <><CircleAlert size={13} /><button type="button" onClick={() => retryMessage(message)} className="inline-flex items-center gap-1 underline"><RotateCw size={11} />আবার পাঠান</button></> : message.deliveryStatus === "READ" ? <CheckCheck size={14} /> : <Check size={13} />}</p>}</div>
            </div>)}
            <div ref={endRef} />
          </div>
          <form onSubmit={sendMessage} className="space-y-2 border-t border-black/5 bg-[#f0f2f5] p-3">
            {!identity && !messages.length && identityLoaded && <div className="grid grid-cols-2 gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="আপনার নাম (ঐচ্ছিক)" aria-label="আপনার নাম (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /><input value={phone} onChange={(event) => { const value = event.target.value.slice(0, 30); setPhone(value); setOrderPhone(value); try { sessionStorage.setItem(PHONE_KEY, value); } catch {} }} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="ফোন (ঐচ্ছিক)" aria-label="ফোন নম্বর (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /></div>}
            <div className="flex items-end gap-2">
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) sendMessage(event); }} maxLength={2000} rows={1} placeholder="আপনার বার্তা লিখুন…" aria-label="বার্তা" className="max-h-28 min-h-10 flex-1 resize-y rounded-2xl border-0 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none ring-1 ring-black/5 focus:ring-emerald-600" />
              <button type="submit" disabled={busy || !text.trim()} aria-label="বার্তা পাঠান" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button>
            </div>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </form>
        </section>
      )}
      {greetingVisible && !open && <div role="status" className="relative mb-1 max-w-[min(19rem,calc(100vw-5rem))] rounded-2xl rounded-br-sm bg-brand px-4 py-3 pr-10 text-sm font-medium text-white shadow-lg"><span>স্যার, কীভাবে সহায়তা করতে পারি?</span><button type="button" onClick={dismissGreeting} aria-label="Greeting বন্ধ করুন" className="absolute right-2 top-2 rounded-full p-1 transition hover:bg-white/15"><X size={15} /></button></div>}
      <button type="button" onClick={() => { setOpen((value) => !value); if (!open) dismissGreeting(); }} aria-label={open ? "চ্যাট বন্ধ করুন" : "চ্যাট শুরু করুন"} aria-expanded={open} className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
        {open ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </div>
  );
}
