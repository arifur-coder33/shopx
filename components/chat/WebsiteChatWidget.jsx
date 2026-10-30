"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, CircleAlert, ImagePlus, LoaderCircle, MessageCircle, Minus, Plus, RotateCw, Send, X, ShoppingBag } from "lucide-react";
import { normalizeChatText } from "@/lib/chatText";

const TOKEN_KEY = "storefront-chat-visitor";
const PHONE_KEY = "storefront-chat-phone";

function renderMessageText(content) {
  return normalizeChatText(content).split(/(https?:\/\/[^\s]+)/giu).map((part, index) =>
    /^https?:\/\//iu.test(part)
      ? <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all">{part}</a>
      : part,
  );
}

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
  const [greetingVisible, setGreetingVisible] = useState(false);
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState("");
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
  const [orderDraft, setOrderDraft] = useState(null);
  const [contactDraft, setContactDraft] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const endRef = useRef(null);
  const photoUrlsRef = useRef(new Set());
  const refreshInFlightRef = useRef(false);

  useEffect(() => () => {
    photoUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    photoUrlsRef.current.clear();
  }, []);

  const releasePhotoPreview = (url) => {
    if (!url) return;
    URL.revokeObjectURL(url);
    photoUrlsRef.current.delete(url);
  };

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

  const refreshMessages = useCallback(async () => {
    if (!token || refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const response = await fetch(`/api/chat/website?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.success && result.data?.messages) setMessages((current) => [
        ...result.data.messages,
        ...current.filter((message) => message.id.startsWith("pending-")),
      ]);
    } catch { /* Poll again on the next interval. */ }
    finally { refreshInFlightRef.current = false; }
  }, [token]);

  useEffect(() => {
    if (!open || !token) return;
    refreshMessages();
    if (!messages.length) return;
    let stopped = false;
    let socket = null;
    let reconnectTimer = null;
    let fallbackTimer = null;
    let reconnectDelay = 1000;
    const connect = () => {
      if (stopped) return;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/api/chat/socket`);
      socket.addEventListener("open", () => socket?.send(JSON.stringify({ type: "website-auth", token })));
      socket.addEventListener("message", (event) => {
        let data;
        try { data = JSON.parse(event.data); } catch { return; }
        if (data.event === "realtime:connected" || data.event === "chat.message") {
          reconnectDelay = 1000;
          refreshMessages();
        }
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      });
      socket.addEventListener("error", () => socket?.close());
    };
    connect();
    fallbackTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && socket?.readyState !== WebSocket.OPEN) refreshMessages();
    }, 2500);
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearInterval(fallbackTimer);
      socket?.close();
    };
  }, [open, token, messages.length, refreshMessages]);

  useEffect(() => {
    if (!open || !token || !messages.some((message) => message.direction === "OUTBOUND" && message.deliveryStatus === "DELIVERED")) return;
    const timer = window.setTimeout(() => fetch("/api/chat/website/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) }).catch(() => {}), 250);
    return () => window.clearTimeout(timer);
  }, [open, token, messages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  const sendMessage = async (event) => {
    event?.preventDefault();
    const content = text.trim();
    if ((!content && !photo) || busy || !token) return;
    const pendingId = `pending-${Date.now()}`;
    const selectedReply = replyTo;
    setBusy(true);
    setError("");
    const previewUrl = photoPreviewUrl || (photo ? URL.createObjectURL(photo) : null);
    if (previewUrl) photoUrlsRef.current.add(previewUrl);
    setMessages((current) => [...current, { id: pendingId, direction: "INBOUND", content: content || "📷 Photo", metadata: { ...(previewUrl && { image: { url: previewUrl, caption: content } }), ...(selectedReply && { replyTo: { content: selectedReply.content } }) }, createdAt: new Date().toISOString(), deliveryStatus: "SENDING" }]);
    setText("");
    const selectedPhoto = photo;
    const pagePath = window.location.pathname;
    setPhoto(null);
    setPhotoPreviewUrl("");
    try {
      let response;
      if (selectedPhoto) {
        const form = new FormData();
        form.set("token", token); form.set("content", content); form.set("name", name); form.set("phone", phone); form.set("pagePath", pagePath); form.set("image", selectedPhoto);
        if (selectedReply) { form.set("replyToMessageId", selectedReply.messageId); if (selectedReply.productId) form.set("replyToProductId", selectedReply.productId); }
        response = await fetch("/api/chat/website/image", { method: "POST", body: form });
      } else response = await fetch("/api/chat/website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, content, name, phone, pagePath, ...(selectedReply && { replyToMessageId: selectedReply.messageId, replyToProductId: selectedReply.productId }) }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "বার্তা পাঠানো যায়নি।");
      setMessages((current) => current.filter((message) => message.id !== result.data.id).map((message) => message.id === pendingId ? result.data : message));
      setReplyTo(null);
      if (previewUrl) releasePhotoPreview(previewUrl);
      setPhotoPreviewUrl("");
      setPhoto(null);
      refreshMessages();
    } catch (sendError) {
      setMessages((current) => current.map((message) => message.id === pendingId ? {
        ...message,
        deliveryStatus: "FAILED",
        ...(selectedPhoto && { retryFile: selectedPhoto }),
        metadata: selectedPhoto ? { ...(message.metadata || {}), type: "IMAGE" } : null,
      } : message));
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
      const response = message.retryFile
        ? await (() => {
            const form = new FormData();
            form.set("token", token); form.set("content", message.metadata?.image?.caption || ""); form.set("name", name); form.set("phone", phone); form.set("pagePath", message.metadata?.websitePage?.path || window.location.pathname); form.set("image", message.retryFile);
            return fetch("/api/chat/website/image", { method: "POST", body: form });
          })()
        : await fetch("/api/chat/website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, content: message.content, name, phone, pagePath: message.metadata?.websitePage?.path || window.location.pathname }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "বার্তা পাঠানো যায়নি।");
      setMessages((current) => current.filter((item) => item.id !== result.data.id).map((item) => item.id === message.id ? { ...result.data } : item));
      if (message.metadata?.image?.url?.startsWith("blob:")) releasePhotoPreview(message.metadata.image.url);
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

  const productAction = async (action, productId, extra = {}) => {
    if (!token || actionBusy) return;
    setActionBusy(true); setError("");
    try {
      const response = await fetch("/api/chat/website/product-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action, productId, ...extra }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "অনুরোধটি সম্পন্ন হয়নি।");
      if (result.data.metadata.type === "CONTACT_FORM") { setOrderDraft(null); setContactDraft({ productId, customerName: name, phoneNumber: phone, deliveryAddress: "" }); }
      if (action === "inbox" && result.data.metadata.type === "ORDER_INBOX") setOrderDraft({ productId, variants: result.data.metadata.variants, buyNowUrl: result.data.metadata.buyNowUrl, variantId: result.data.metadata.variants.length === 1 ? result.data.metadata.variants[0].id : "", customerName: name, phoneNumber: phone, deliveryAddress: "", district: "", thana: "", deliveryArea: "outside-dhaka", paymentMethod: "COD" });
      if (action === "place") { setOrderDraft(null); setPhone(extra.phoneNumber); setOrderPhone(extra.phoneNumber); }
      if (action === "lead") { setContactDraft(null); setPhone(extra.phoneNumber); setOrderPhone(extra.phoneNumber); }
      await refreshMessages();
    } catch (actionError) { setError(actionError.message || "অনুরোধটি সম্পন্ন হয়নি।"); }
    finally { setActionBusy(false); }
  };

  const submitChatOrder = (event) => {
    event.preventDefault();
    if (!orderDraft) return;
    if (!/^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(orderDraft.phoneNumber.replace(/\D/g, ""))) { setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন।"); return; }
    productAction("place", orderDraft.productId, orderDraft);
  };
  const submitContact = (event) => {
    event.preventDefault();
    if (!contactDraft) return;
    if (!/^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(contactDraft.phoneNumber.replace(/\D/g, ""))) { setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন।"); return; }
    productAction("lead", contactDraft.productId, contactDraft);
  };

  if (!enabled) return null;
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-2 z-[70] flex flex-col items-end gap-3 sm:right-4 md:bottom-5 md:right-5">
      {open && (
        <section className="fixed inset-0 z-[80] flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden border-0 border-black/5 bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:relative sm:inset-auto sm:z-auto sm:h-[min(42rem,calc(100dvh-7.5rem))] sm:min-h-[24rem] sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-3xl sm:border sm:py-0" aria-label="Website chat">
          <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15"><MessageCircle size={21} /></span><div className="min-w-0"><h2 className="truncate font-bold">আমাদের সাথে কথা বলুন</h2><p className="flex items-center gap-1.5 text-xs text-white/85"><span className="h-2 w-2 animate-pulse rounded-full bg-white" />LIVE · সাধারণত দ্রুত উত্তর দিই</p></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="চ্যাট বন্ধ করুন" className="rounded-full p-2 transition hover:bg-white/15"><X size={19} /></button>
          </header>
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-black/5 bg-[#f0f2f5] p-2"><button type="button" onClick={toggleOrders} aria-expanded={ordersOpen} aria-label={ordersOpen ? "Order list বন্ধ করুন" : "Order list খুলুন"} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-primary shadow-sm transition hover:bg-primary-soft"><ShoppingBag size={15} />আমার order<span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-white">{ordersOpen ? <Minus size={13} /> : <Plus size={13} />}</span></button></div>
          {ordersOpen && <section className="max-h-[35dvh] shrink-0 space-y-2 overflow-y-auto border-b border-border bg-background p-3 sm:max-h-64" aria-label="আপনার order">
            {!identity && <form onSubmit={lookupOrders} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={orderNo} onChange={(event) => setOrderNo(event.target.value)} maxLength={40} placeholder="Order number" aria-label="Order number" className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text" /><input value={orderPhone} onChange={(event) => setOrderPhone(event.target.value)} onBlur={() => { try { sessionStorage.setItem(PHONE_KEY, orderPhone); } catch {} }} type="tel" inputMode="tel" maxLength={30} placeholder="Order-এর phone number" aria-label="Order-এর phone number" className="min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-text" /><button disabled={ordersBusy || !orderNo.trim() || orderPhone.replace(/\D/g, "").length < 10} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{ordersBusy ? "খুঁজছি…" : "খুঁজুন"}</button></form>}
            {identity && ordersBusy && <p className="text-xs text-text-muted">আপনার order খোঁজা হচ্ছে…</p>}
            {ordersError && <p role="alert" className="text-xs text-red-600">{ordersError}</p>}
            {orders.map((order) => <div key={order.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2"><details className="min-w-0 flex-1"><summary className="cursor-pointer text-xs font-semibold text-text">{order.orderNo} · {order.status} · ৳{Number(order.orderPrice).toLocaleString("en-BD")}</summary><div className="mt-2 space-y-2 border-t border-border pt-2 text-xs text-text-muted"><p>Order date: {new Intl.DateTimeFormat("bn-BD", { dateStyle: "medium" }).format(new Date(order.createdAt))}</p>{order.orderItems.map((item, index) => <p key={`${item.productName}-${index}`}>{item.productName} × {item.quantity} · ৳{Number(item.price).toLocaleString("en-BD")}</p>)}<ol className="space-y-1 border-l border-border pl-3">{order.timeline.map((event, index) => <li key={`${event.status}-${index}`}><b className="text-text">{event.title}</b>{event.message ? ` · ${event.message}` : ""}<span className="ml-1">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</span></li>)}</ol></div></details>{identity && <button type="button" disabled={Boolean(sharingOrderId)} onClick={() => shareOrder(order)} aria-label={`${order.orderNo} chat-এ পাঠান`} title="এই order chat-এ পাঠান" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-sm transition hover:opacity-90 disabled:opacity-50">{sharingOrderId === order.id ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={15} />}</button>}</div>)}
            {identity && !ordersBusy && !ordersError && !orders.length && <p className="text-xs text-text-muted">আপনার account-এ কোনো order পাওয়া যায়নি।</p>}
            {orderShareNotice && <p role="status" className="text-xs text-emerald-700">{orderShareNotice}</p>}
            {!identityLoaded && <p className="text-xs text-text-muted">অপেক্ষা করুন…</p>}
          </section>}
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-3 sm:p-4" aria-live="polite">
            <div className="mr-8 rounded-2xl rounded-tl-sm bg-white p-3 text-sm text-slate-800 shadow-sm">{welcome}</div>
            {messages.map((message) => <div key={message.id} className={`flex ${message.direction === "INBOUND" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm shadow-sm ${message.direction === "INBOUND" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900" : "rounded-tl-sm bg-white text-slate-800"}`}>
                {message.metadata?.replyTo && <div className="mb-2 border-l-2 border-primary/50 bg-black/5 px-2 py-1 text-xs"><b>Reply</b><p className="line-clamp-2">{normalizeChatText(message.metadata.replyTo.content)}</p></div>}
                {message.metadata?.productOptions?.length ? <div className="mb-2 flex max-w-full snap-x gap-2 overflow-x-auto pb-2">{message.metadata.productOptions.map((product, index) => <div key={`${message.id}-product-${product.id}`} className="w-[min(15rem,72vw)] shrink-0 snap-start overflow-hidden rounded-xl border border-black/10 bg-white text-slate-800">{product.imageUrl && <img src={product.imageUrl} alt={product.title} loading="lazy" className="max-h-64 w-full object-contain" />}<div className="p-3"><strong className="text-sm">পণ্য-{index + 1}: {product.title}</strong>{product.price != null && <p className="mt-1 font-semibold">৳{Number(product.price).toLocaleString("en-BD")}</p>}<p className={`mt-1 text-xs font-semibold ${product.inStock === false && !product.canOrder ? "text-red-600" : "text-emerald-700"}`}>{product.inStock === false && product.canOrder ? "অর্ডার নেওয়া যাচ্ছে" : product.inStock === false ? "স্টকে নেই" : "স্টকে আছে"}</p>{product.features?.length > 0 && <p className="mt-1 text-xs text-slate-600">{product.features.join(" · ")}</p>}{product.variants?.length > 1 && <ul className="mt-2 space-y-2 text-xs text-slate-700">{product.variants.map((variant, variantIndex) => <li key={`${product.id}-variant-${variantIndex}`} className="flex items-center gap-2">{variant.imageUrl && <img src={variant.imageUrl} alt="" loading="lazy" className="h-8 w-8 rounded object-cover" />}<span>• {variant.label}{variant.price != null ? ` · ৳${Number(variant.price).toLocaleString("en-BD")}` : ""}{variant.inStock === false ? (variant.canOrder ? " · অর্ডার নেওয়া যাচ্ছে" : " · স্টক নেই") : ""}</span></li>)}</ul>}<div className="mt-3 flex gap-2">{product.url && <a href={product.url} target="_blank" rel="noreferrer" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700">পণ্য দেখুন</a>}{product.buyNowUrl && <a href={product.buyNowUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white">এখনই কিনুন</a>}</div><button type="button" disabled={actionBusy} onClick={() => productAction("select", product.id)} className="mt-2 w-full rounded-lg bg-brand px-3 py-2 text-center text-xs font-semibold text-white disabled:opacity-50">Select this product</button></div></div>)}{message.metadata.seeMoreUrl && <a href={message.metadata.seeMoreUrl} target="_blank" rel="noreferrer" className="flex w-[min(15rem,72vw)] shrink-0 snap-start flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-700">আরও পণ্য দেখুন<span className="mt-1 text-xs font-normal text-slate-500">সব সার্চ রেজাল্ট দেখুন →</span></a>}</div> : message.metadata?.image?.url && <a href={message.metadata.image.url} target="_blank" rel="noreferrer" className="mb-2 block overflow-hidden rounded-xl"><img src={message.metadata.image.url} alt="Chat photo" loading="lazy" className="max-h-72 w-full object-contain" /></a>}
                {message.metadata?.type === "PRODUCT_CARD" && message.metadata.product && <><a href={message.metadata.product.url} className="mb-2 block overflow-hidden rounded-xl bg-white text-gray-900" target="_blank" rel="noreferrer">{message.metadata.product.imageUrl && <img src={message.metadata.product.imageUrl} alt="" className="h-36 w-full object-cover" />}<span className="block p-2"><strong className="block text-sm">{message.metadata.product.title}</strong><span className="text-sm font-bold">৳{Number(message.metadata.product.price).toLocaleString("en-BD")}</span><span className="mt-1 block text-xs text-blue-700">পণ্য দেখুন →</span></span></a>{message.metadata.product.buyNowUrl && <a href={message.metadata.product.buyNowUrl} target="_blank" rel="noreferrer" className="mb-2 inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">এখনই কিনুন</a>}</>}
                {message.metadata?.type === "ORDER_CHOICE" && <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={actionBusy} onClick={() => productAction("website", message.metadata.productId)} className="rounded-lg border border-slate-300 px-2 py-2 text-xs font-semibold disabled:opacity-50">ওয়েবসাইটে</button><button type="button" disabled={actionBusy} onClick={() => productAction("inbox", message.metadata.productId)} className="rounded-lg bg-brand px-2 py-2 text-xs font-semibold text-white disabled:opacity-50">এই চ্যাটে</button></div>}
                {message.metadata?.type === "CONTACT_FORM" && <button type="button" onClick={() => setContactDraft({ productId: message.metadata.productId || "", customerName: name, phoneNumber: phone, deliveryAddress: "" })} className="mt-2 block w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">নাম, ফোন ও ঠিকানা দিন</button>}
                {message.metadata?.type === "ORDER_WEBSITE" && <a href={message.metadata.buyNowUrl} className="mt-2 block rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white">অর্ডার পেজে যান</a>}
                {message.metadata?.type === "ORDER_PLACED" && <><a href={message.metadata.trackingUrl} className="mt-2 block rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white">অর্ডার ট্র্যাক করুন</a>{message.metadata.invoiceUrl && <a href={message.metadata.invoiceUrl} target="_blank" rel="noreferrer" className="mt-2 block rounded-lg border border-emerald-700 px-3 py-2 text-center text-xs font-semibold text-emerald-800">View invoice</a>}</>}
                {message.metadata?.type === "ORDER_TIMELINE" && message.metadata.order && <div className="mb-1 rounded-xl bg-white p-3 text-gray-900"><strong className="block text-sm">অর্ডার {message.metadata.order.orderNo}</strong><p className="mt-1 text-xs">বর্তমান অবস্থা: {message.metadata.order.status}</p><ol className="mt-2 space-y-2 border-l border-gray-200 pl-3">{message.metadata.order.events.map((event, index) => <li key={`${event.status}-${index}`} className="text-xs"><b>{event.title}</b>{event.message ? ` · ${event.message}` : ""}{event.location ? ` · ${event.location}` : ""}<span className="mt-0.5 block text-[10px] text-gray-500">{new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</span></li>)}</ol></div>}
                {message.authorType === "AI" && message.deliveryStatus === "SENDING" ? <div role="status" aria-label="উত্তর লিখছে" className="flex min-w-14 items-center justify-center gap-1 rounded-full bg-slate-100 px-3 py-2">{[0, 1, 2].map((dot) => <span key={dot} className="h-2 w-2 animate-bounce rounded-full bg-slate-500" style={{ animationDelay: `${dot * 160}ms` }} />)}</div> : !["PRODUCT_CARD", "ORDER_TIMELINE"].includes(message.metadata?.type) && !(message.metadata?.image?.url && message.content === "📷 Photo") && <p className="whitespace-pre-wrap break-words">{renderMessageText(message.content)}</p>}
                {message.metadata?.checkoutOptions?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.metadata.checkoutOptions.map((option) => <button key={option.payload} type="button" disabled={actionBusy || messages.some((item) => item.metadata?.chatOrderFlow && new Date(item.createdAt) > new Date(message.createdAt))} onClick={() => productAction("checkout", message.metadata.orderProductId || "", { payload: option.payload, title: option.title })} className="rounded-lg border border-emerald-700 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-40">{option.title}</button>)}</div>}
                {message.direction === "OUTBOUND" && message.metadata?.productOptions?.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{message.metadata.productOptions.map((product) => <button key={`${message.id}-reply-${product.id}`} type="button" onClick={() => setReplyTo({ messageId: message.id, productId: product.id, content: product.title })} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">↩ {product.title} নিয়ে বলুন</button>)}</div>}
                {message.direction === "OUTBOUND" && message.metadata?.image?.productId && <button type="button" onClick={() => setReplyTo({ messageId: message.id, productId: message.metadata.image.productId, content: message.metadata.image.productTitle || message.content })} className="mt-2 rounded-full border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700">↩ এই পণ্যটি নিয়ে বলুন</button>}
                {message.metadata?.edited && <p className="mt-1 text-right text-[10px] italic opacity-70">edited</p>}
                {message.direction === "INBOUND" && message.deliveryStatus && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-600">{message.deliveryStatus === "SENDING" ? <LoaderCircle size={12} className="animate-spin" /> : message.deliveryStatus === "FAILED" ? <><CircleAlert size={13} />{!message.metadata?.photoRetryUnsupported && <button type="button" onClick={() => retryMessage(message)} className="inline-flex items-center gap-1 underline"><RotateCw size={11} />Resend</button>}</> : message.deliveryStatus === "READ" ? <CheckCheck size={14} /> : <Check size={13} />}</p>}
              </div>
            </div>)}
            <div ref={endRef} />
          </div>
          {contactDraft && <form onSubmit={submitContact} className="max-h-[45dvh] shrink-0 space-y-2 overflow-y-auto border-t border-slate-200 bg-white p-3 text-xs" aria-label="যোগাযোগের তথ্য"><div className="flex items-center justify-between"><strong>যোগাযোগের তথ্য দিন</strong><button type="button" onClick={() => setContactDraft(null)} aria-label="ফর্ম বন্ধ করুন"><X size={16} /></button></div>{[["customerName", "আপনার নাম"], ["phoneNumber", "মোবাইল নম্বর"], ["deliveryAddress", "সম্পূর্ণ ঠিকানা"]].map(([field, label]) => <label key={field} className="block"><span>{label}</span><input required value={contactDraft[field]} type={field === "phoneNumber" ? "tel" : "text"} inputMode={field === "phoneNumber" ? "numeric" : undefined} maxLength={field === "phoneNumber" ? 13 : field === "deliveryAddress" ? 250 : 100} onChange={(event) => setContactDraft((draft) => ({ ...draft, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}<button type="submit" disabled={actionBusy} className="w-full rounded-lg bg-brand px-3 py-2 font-semibold text-white disabled:opacity-50">{actionBusy ? "পাঠানো হচ্ছে…" : "তথ্য পাঠান"}</button></form>}
          {orderDraft && <form onSubmit={submitChatOrder} className="max-h-[48dvh] shrink-0 space-y-2 overflow-y-auto border-t border-slate-200 bg-white p-3 text-xs" aria-label="চ্যাটে অর্ডার ফর্ম"><div className="flex items-center justify-between"><strong>চ্যাটে অর্ডার করুন</strong><button type="button" onClick={() => setOrderDraft(null)} aria-label="অর্ডার ফর্ম বন্ধ করুন"><X size={16} /></button></div>{orderDraft.variants.length > 1 && <div><p className="mb-1">ভ্যারিয়েন্ট বেছে নিন</p><div className="flex flex-wrap gap-1">{orderDraft.variants.map((variant) => <button key={variant.id} type="button" disabled={!variant.canOrder} onClick={() => setOrderDraft((draft) => ({ ...draft, variantId: variant.id }))} className={`rounded-lg border px-2 py-1.5 ${orderDraft.variantId === variant.id ? "border-brand bg-primary-soft" : "border-slate-300"} disabled:opacity-40`}>{variant.label} · ৳{variant.price}{!variant.canOrder && " · স্টক নেই"}</button>)}</div>{orderDraft.variants.find((variant) => variant.id === orderDraft.variantId)?.imageUrl && <img src={orderDraft.variants.find((variant) => variant.id === orderDraft.variantId).imageUrl} alt="নির্বাচিত ভ্যারিয়েন্ট" className="mt-2 h-20 w-20 rounded-lg object-cover" />}</div>}{[["customerName", "আপনার নাম"], ["phoneNumber", "মোবাইল নম্বর"], ["deliveryAddress", "সম্পূর্ণ ঠিকানা"], ["district", "জেলা"], ["thana", "থানা"]].map(([field, label]) => <label key={field} className="block"><span>{label}</span><input required value={orderDraft[field]} type={field === "phoneNumber" ? "tel" : "text"} inputMode={field === "phoneNumber" ? "numeric" : undefined} maxLength={field === "phoneNumber" ? 13 : field === "deliveryAddress" ? 250 : 100} onChange={(event) => setOrderDraft((draft) => ({ ...draft, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>)}<label className="block"><span>ডেলিভারি এলাকা</span><select value={orderDraft.deliveryArea} onChange={(event) => setOrderDraft((draft) => ({ ...draft, deliveryArea: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"><option value="inside-dhaka">ঢাকার ভিতরে</option><option value="outside-dhaka">ঢাকার বাইরে</option></select></label><p>পেমেন্ট: ক্যাশ অন ডেলিভারি। অনলাইন পেমেন্টের জন্য ওয়েবসাইটে অর্ডার করুন।</p><button type="submit" disabled={actionBusy || !orderDraft.variantId} className="w-full rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white disabled:opacity-50">{actionBusy ? "অর্ডার হচ্ছে…" : "Place Order"}</button></form>}
          <form onSubmit={sendMessage} className="shrink-0 space-y-2 border-t border-black/5 bg-[#f0f2f5] p-3">
            {replyTo && <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700"><span className="min-w-0 flex-1 truncate">Replying to: {replyTo.content}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Reply target সরান" className="rounded-full p-1 hover:bg-black/5"><X size={14} /></button></div>}
            {!identity && !messages.length && identityLoaded && <div className="grid grid-cols-2 gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="আপনার নাম (ঐচ্ছিক)" aria-label="আপনার নাম (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /><input value={phone} onChange={(event) => { const value = event.target.value.slice(0, 30); setPhone(value); setOrderPhone(value); try { sessionStorage.setItem(PHONE_KEY, value); } catch {} }} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="ফোন (ঐচ্ছিক)" aria-label="ফোন নম্বর (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /></div>}
            {photo && <div className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs text-slate-700"><img src={photoPreviewUrl} alt="Photo preview" className="h-16 w-16 shrink-0 rounded-md object-cover" /><span className="min-w-0 flex-1">Photo selected</span><button type="button" onClick={() => { releasePhotoPreview(photoPreviewUrl); setPhotoPreviewUrl(""); setPhoto(null); }} aria-label="Photo সরান" className="ml-2 rounded-full p-1 hover:bg-black/5"><X size={14} /></button></div>}
            <div className="flex items-end gap-2">
              <label className={`grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-black/5 hover:bg-slate-50 ${busy ? "pointer-events-none opacity-50" : ""}`} aria-label="Photo যোগ করুন"><ImagePlus size={18} /><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setError("Photo সর্বোচ্চ 5 MB হতে পারে।"); event.target.value = ""; return; } releasePhotoPreview(photoPreviewUrl); const previewUrl = URL.createObjectURL(file); photoUrlsRef.current.add(previewUrl); setPhotoPreviewUrl(previewUrl); setPhoto(file); setError(""); }} /></label>
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) sendMessage(event); }} maxLength={2000} rows={1} placeholder="আপনার বার্তা লিখুন…" aria-label="বার্তা" className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border-0 bg-white px-4 py-2.5 text-base text-slate-800 outline-none ring-1 ring-black/5 focus:ring-primary sm:resize-y sm:text-sm" />
              <button type="submit" disabled={busy || (!text.trim() && !photo)} aria-label="বার্তা পাঠান" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button>
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
