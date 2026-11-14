"use client";

import { getEmailConversationAction, getEmailSupportInboxAction, replyToEmailConversationAction } from "@/backend/serverActions/emailSupportAction";
import { Bell, Mail, RefreshCw, Send } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const dateLabel = (value) => new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

export default function EmailSupportInbox({ canUpdate }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState("");
  const [permission, setPermission] = useState("default");
  const [busy, startTransition] = useTransition();
  const firstLoad = useRef(true);
  const latestInboundId = useRef("");

  const loadInbox = useCallback(async () => {
    const result = await getEmailSupportInboxAction();
    if (!result.success) { setError(result.message); return; }
    const rows = result.data || [];
    const newest = rows.find((row) => row.messages?.[0]?.direction === "INBOUND")?.messages?.[0];
    if (!firstLoad.current && newest?.id && newest.id !== latestInboundId.current) {
      if (permission === "granted" && "Notification" in window) new Notification("নতুন customer email", { body: `${newest.textBody.slice(0, 100)}`, tag: newest.id });
    }
    if (newest?.id) latestInboundId.current = newest.id;
    firstLoad.current = false;
    setConversations(rows);
    setError("");
  }, [permission]);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    loadInbox();
    const timer = setInterval(loadInbox, 8000);
    return () => clearInterval(timer);
  }, [loadInbox]);

  const selectConversation = async (id) => {
    setSelectedId(id);
    const result = await getEmailConversationAction(id);
    if (!result.success) { setError(result.message); return; }
    setConversation(result.data);
    setConversations((rows) => rows.map((row) => row.id === id ? { ...row, unreadCount: 0 } : row));
  };

  const sendReply = (event) => {
    event.preventDefault();
    if (!selectedId || !reply.trim() || busy) return;
    startTransition(async () => {
      const result = await replyToEmailConversationAction({ conversationId: selectedId, message: reply });
      if (!result.success) { setError(result.message); return; }
      setReply("");
      const refreshed = await getEmailConversationAction(selectedId);
      if (refreshed.success) setConversation(refreshed.data);
      await loadInbox();
    });
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(await Notification.requestPermission());
  };

  return <div className="flex h-[calc(100dvh-5rem)] min-h-[520px] flex-col p-3 sm:p-5">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-bold text-text">Customer Email Inbox</h1><p className="text-xs text-text-muted">Webhook update · প্রতি ৮ সেকেন্ডে inbox refresh</p></div><div className="flex gap-2"><button onClick={enableNotifications} type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"><Bell size={15} />{permission === "granted" ? "Notification on" : "Notification"}</button><button onClick={loadInbox} type="button" className="rounded-lg border border-border p-2" aria-label="Refresh inbox"><RefreshCw size={16} /></button><Link href="/admin/settings/email" className="button text-xs">Email settings</Link></div></header>
    {error && <p className="mb-2 rounded-lg bg-red-100 p-2 text-sm text-red-700">{error}</p>}
    <div className="grid min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[minmax(250px,340px)_1fr]">
      <aside className="overflow-y-auto border-b border-border md:border-b-0 md:border-r">{conversations.length ? conversations.map((item) => <button type="button" key={item.id} onClick={() => selectConversation(item.id)} className={`w-full border-b border-border p-3 text-left hover:bg-surface-muted ${item.id === selectedId ? "bg-primary/10" : ""}`}><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-text">{item.customerEmail}</strong>{item.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{item.unreadCount}</span>}</span><span className="mt-1 block truncate text-xs font-semibold text-text">{item.subject}</span><span className="mt-1 block truncate text-xs text-text-muted">{item.messages?.[0]?.textBody || "(No message body)"}</span><span className="mt-1 block text-[10px] text-text-muted">{dateLabel(item.lastMessageAt)}</span></button>) : <div className="p-5 text-sm text-text-muted"><Mail className="mb-2" />ইমেইল এখনো আসেনি। Receiving address ও webhook <Link href="/admin/settings/email" className="text-primary underline">configure করুন</Link>.</div>}</aside>
      <main className="flex min-h-0 flex-col">{conversation ? <><div className="border-b border-border p-4"><h2 className="font-bold text-text">{conversation.subject}</h2><p className="text-xs text-text-muted">{conversation.customerEmail}</p></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{conversation.messages.map((item) => <article key={item.id} className={`max-w-3xl rounded-2xl p-3 ${item.direction === "OUTBOUND" ? "ml-auto bg-primary/10" : "bg-surface-muted"}`}><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-text-muted"><strong>{item.direction === "OUTBOUND" ? "আপনি" : item.fromEmail}</strong><span>{dateLabel(item.createdAt)}</span></div><p className="whitespace-pre-wrap break-words text-sm text-text">{item.textBody}</p></article>)}</div>{canUpdate && <form onSubmit={sendReply} className="flex gap-2 border-t border-border p-3"><textarea value={reply} onChange={(event) => setReply(event.target.value)} disabled={busy} maxLength={20000} rows={3} className="min-w-0 flex-1 resize-y rounded-xl border border-border bg-background p-3 text-sm text-text" placeholder="Reply লিখুন…" /><button disabled={busy || !reply.trim()} className="inline-flex items-center gap-2 self-end rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />{busy ? "পাঠাচ্ছে…" : "পাঠান"}</button></form>}</> : <div className="grid flex-1 place-items-center text-sm text-text-muted">একটি email conversation বেছে নিন</div>}</main>
    </div>
  </div>;
}
