"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, CircleAlert, LoaderCircle, MessageCircle, RotateCw, Send, X } from "lucide-react";

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

export default function WebsiteChatWidget() {
  const [enabled, setEnabled] = useState(false);
  const [welcome, setWelcome] = useState("আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?");
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    setToken(getToken());
    try { setPhone(sessionStorage.getItem(PHONE_KEY) || ""); } catch {}
    fetch("/api/chat/config", { cache: "no-store" })
      .then((response) => response.json())
      .then((config) => { setEnabled(Boolean(config.enabled)); setWelcome(config.welcomeMessage || welcome); })
      .catch(() => setEnabled(false));
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

  if (!enabled) return null;
  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-[70] flex flex-col items-end gap-3 md:bottom-5 md:right-5">
      {open && (
        <section className="flex h-[min(34rem,calc(100dvh-9rem))] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" aria-label="Website chat">
          <header className="flex items-center justify-between bg-brand px-4 py-3 text-white">
            <div><h2 className="font-bold">আমাদের সাথে কথা বলুন</h2><p className="text-xs text-white/80">সাধারণত দ্রুত উত্তর দিই</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="চ্যাট বন্ধ করুন" className="rounded-full p-2 hover:bg-white/15"><X size={19} /></button>
          </header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-3" aria-live="polite">
            <div className="mr-8 rounded-2xl rounded-tl-sm bg-surface p-3 text-sm text-text shadow-sm">{welcome}</div>
            {messages.map((message) => <div key={message.id} className={`flex ${message.direction === "INBOUND" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.direction === "INBOUND" ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm bg-surface text-text shadow-sm"}`}><p className="whitespace-pre-wrap break-words">{message.content}</p>{message.direction === "INBOUND" && message.deliveryStatus && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-white/75">{message.deliveryStatus === "SENDING" ? <LoaderCircle size={12} className="animate-spin" /> : message.deliveryStatus === "FAILED" ? <><CircleAlert size={13} /><button type="button" onClick={() => retryMessage(message)} className="inline-flex items-center gap-1 underline"><RotateCw size={11} />আবার পাঠান</button></> : message.deliveryStatus === "READ" ? <CheckCheck size={14} /> : <Check size={13} />}</p>}</div>
            </div>)}
            <div ref={endRef} />
          </div>
          <form onSubmit={sendMessage} className="space-y-2 border-t border-border bg-surface p-3">
            {!messages.length && <div className="grid grid-cols-2 gap-2"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="আপনার নাম (ঐচ্ছিক)" aria-label="আপনার নাম (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /><input value={phone} onChange={(event) => { const value = event.target.value.slice(0, 30); setPhone(value); try { sessionStorage.setItem(PHONE_KEY, value); } catch {} }} type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="ফোন (ঐচ্ছিক)" aria-label="ফোন নম্বর (ঐচ্ছিক)" className="min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" /></div>}
            <div className="flex items-end gap-2">
              <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) sendMessage(event); }} maxLength={2000} rows={1} placeholder="আপনার বার্তা লিখুন…" aria-label="বার্তা" className="max-h-28 min-h-10 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand" />
              <button type="submit" disabled={busy || !text.trim()} aria-label="বার্তা পাঠান" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand text-white disabled:opacity-50">{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Send size={18} />}</button>
            </div>
            {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
          </form>
        </section>
      )}
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "চ্যাট বন্ধ করুন" : "চ্যাট শুরু করুন"} aria-expanded={open} className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-xl transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
        {open ? <X size={24} /> : <MessageCircle size={25} />}
      </button>
    </div>
  );
}
