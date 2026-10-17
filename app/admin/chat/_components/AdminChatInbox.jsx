"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getChatAssignableUsersAction, getChatConversationAction, getChatInboxAction, sendChatReplyAction, updateChatConversationAction } from "@/backend/serverActions/chatActions";
import { Search, Send, MessagesSquare, MessageCircle, Globe2, LoaderCircle, Check, CheckCheck, Clock3, UserRound, RotateCw, CircleAlert } from "lucide-react";

const channelLabels = { WEBSITE: "Website", WHATSAPP: "WhatsApp", MESSENGER: "Messenger" };
const statusLabels = { OPEN: "Open", PENDING: "Pending", CLOSED: "Closed" };
const dateTime = (value) => value ? new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "";

export default function AdminChatInbox({ initialConversations, canUpdate, initialError = "" }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(initialConversations[0]?.id || "");
  const [conversation, setConversation] = useState(null);
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [agents, setAgents] = useState([]);

  const loadInbox = useCallback(async () => {
    const result = await getChatInboxAction({ channel, status });
    if (!result.success) { setError(result.message); return; }
    setConversations(result.data);
    setSelectedId((current) => current && result.data.some((item) => item.id === current) ? current : result.data[0]?.id || "");
    setError("");
  }, [channel, status]);

  const loadConversation = useCallback(async () => {
    if (!selectedId) { setConversation(null); return; }
    const result = await getChatConversationAction(selectedId);
    if (result.success) setConversation(result.data);
    else setError(result.message);
  }, [selectedId]);

  useEffect(() => { loadInbox(); }, [loadInbox]);
  useEffect(() => { loadConversation(); }, [loadConversation]);
  useEffect(() => { getChatAssignableUsersAction().then((result) => { if (result.success) setAgents(result.data); }); }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") { loadInbox(); loadConversation(); }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [loadInbox, loadConversation]);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) => [item.customerName, item.customerPhone, item.messages?.[0]?.content].some((value) => String(value || "").toLocaleLowerCase().includes(term)));
  }, [conversations, search]);

  const sendReply = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedId || busy || !canUpdate) return;
    const content = draft.trim();
    const pendingId = `pending-${Date.now()}`;
    const pending = { id: pendingId, conversationId: selectedId, channel: conversation?.channel, direction: "OUTBOUND", authorType: "AGENT", content, deliveryStatus: "SENDING", createdAt: new Date().toISOString() };
    setBusy(true); setError(""); setDraft("");
    setConversation((current) => current ? { ...current, messages: [...current.messages, pending] } : current);
    const result = await sendChatReplyAction(selectedId, content);
    if (result.success) {
      setConversation((current) => current ? { ...current, messages: current.messages.map((item) => item.id === pendingId ? result.data : item) } : current);
      if (result.warning) setError(`${result.warning} Message-এ Retry চাপুন।`);
      await loadInbox();
    } else {
      setConversation((current) => current ? { ...current, messages: current.messages.filter((item) => item.id !== pendingId) } : current);
      setDraft(content); setError(result.message || "Reply could not be sent.");
    }
    setBusy(false);
  };

  const retryReply = async (messageId) => {
    if (!selectedId || busy || !canUpdate) return;
    setBusy(true); setError("");
    setConversation((current) => current ? { ...current, messages: current.messages.map((item) => item.id === messageId ? { ...item, deliveryStatus: "SENDING" } : item) } : current);
    const result = await sendChatReplyAction(selectedId, "", messageId);
    if (result.success) {
      setConversation((current) => current ? { ...current, messages: current.messages.map((item) => item.id === messageId ? result.data : item) } : current);
      if (result.warning) setError(`${result.warning} আবার চেষ্টা করুন।`);
    } else { setError(result.message || "Retry failed."); await loadConversation(); }
    setBusy(false);
  };

  const changeStatus = async (nextStatus) => {
    if (!selectedId || !canUpdate) return;
    const result = await updateChatConversationAction(selectedId, { status: nextStatus });
    if (result.success) await Promise.all([loadConversation(), loadInbox()]);
    else setError(result.message || "Status could not be updated.");
  };

  const assignAgent = async (assignedToId) => {
    if (!selectedId || !canUpdate) return;
    const result = await updateChatConversationAction(selectedId, { assignedToId: assignedToId || null });
    if (result.success) await Promise.all([loadConversation(), loadInbox()]);
    else setError(result.message || "Assignment could not be updated.");
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-medium text-primary">Customer Support</p><h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">Chat Inbox</h1><p className="mt-1 text-sm text-text-muted">Website, WhatsApp ও Messenger conversation এক জায়গায়।</p></div>
        <a href="/admin/chat/settings" className="button">Chat Settings</a>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <section className="grid min-h-[min(72vh,760px)] overflow-hidden rounded-2xl border border-border bg-surface lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className={`min-w-0 border-b border-border lg:border-b-0 lg:border-r ${selectedId ? "hidden lg:block" : ""}`}>
          <div className="space-y-3 border-b border-border p-3">
            <label className="relative block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="নাম বা message খুঁজুন" className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-brand" /></label>
            <div className="grid grid-cols-2 gap-2"><select value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-text"><option value="ALL">সব channel</option><option value="WEBSITE">Website</option><option value="WHATSAPP">WhatsApp</option><option value="MESSENGER">Messenger</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-text"><option value="OPEN">Open</option><option value="PENDING">Pending</option><option value="CLOSED">Closed</option><option value="ALL">সব status</option></select></div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto lg:max-h-[calc(72vh-6rem)]">
            {visibleConversations.length ? visibleConversations.map((item) => {
              const Icon = item.channel === "WEBSITE" ? Globe2 : item.channel === "WHATSAPP" ? MessageCircle : MessagesSquare;
              const lastMessage = item.messages?.[0];
              return <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full border-b border-border/70 p-3 text-left transition hover:bg-background ${selectedId === item.id ? "bg-primary-soft" : ""}`}>
                <span className="flex items-center gap-2"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-primary"><Icon size={18} /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-text">{item.customerName || item.customerPhone || `${channelLabels[item.channel]} · ${item.externalUserId.slice(-6)}`}</span><span className="flex shrink-0 items-center gap-1.5"><span className="text-[10px] text-text-muted">{dateTime(item.lastMessageAt)}</span>{item.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{item.unreadCount}</span>}</span></span><span className="mt-1 block truncate text-xs text-text-muted">{lastMessage?.direction === "OUTBOUND" ? "আপনি: " : ""}{lastMessage?.content || "নতুন conversation"}{item.assignedTo?.name ? ` · ${item.assignedTo.name}` : ""}</span></span></span>
              </button>;
            }) : <p className="p-6 text-center text-sm text-text-muted">এই filter-এ কোনো conversation নেই।</p>}
          </div>
        </aside>
        <div className={`flex min-h-[65vh] min-w-0 flex-col ${!selectedId ? "hidden lg:flex" : ""}`}>
          {conversation ? <>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3 sm:p-4">
              <div className="flex min-w-0 items-center gap-2"><button type="button" onClick={() => setSelectedId("")} className="rounded px-2 py-1 text-sm text-primary lg:hidden">← Inbox</button><div className="min-w-0"><h2 className="truncate font-bold text-text">{conversation.customerName || conversation.customerPhone || `${channelLabels[conversation.channel]} · ${conversation.externalUserId.slice(-6)}`}</h2><p className="text-xs text-text-muted">{channelLabels[conversation.channel]} · {statusLabels[conversation.status]}{conversation.customerPhone ? ` · ${conversation.customerPhone}` : ""}</p></div></div>
              {canUpdate && <div className="flex flex-wrap gap-2"><select value={conversation.assignedToId || ""} onChange={(event) => assignAgent(event.target.value)} aria-label="Assign conversation" className="max-w-36 rounded-lg border border-border bg-background px-2 py-2 text-xs text-text"><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}</select><button type="button" onClick={() => changeStatus(conversation.status === "PENDING" ? "OPEN" : "PENDING")} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-background"><Clock3 size={14} />{conversation.status === "PENDING" ? "Open" : "Pending"}</button><button type="button" onClick={() => changeStatus(conversation.status === "CLOSED" ? "OPEN" : "CLOSED")} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-background"><Check size={14} />{conversation.status === "CLOSED" ? "Reopen" : "Close"}</button></div>}
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-background/50 p-3 sm:p-5">
              {conversation.messages.map((message) => <div key={message.id} className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.direction === "OUTBOUND" ? "rounded-tr-sm bg-brand text-white" : "rounded-tl-sm border border-border bg-surface text-text"}`}><p className="whitespace-pre-wrap break-words text-sm">{message.content}</p><p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${message.direction === "OUTBOUND" ? "text-white/75" : "text-text-muted"}`}>{message.authorType === "AI" ? "AI" : message.authorType === "AGENT" ? "Staff" : channelLabels[message.channel]} · {dateTime(message.createdAt)}{message.direction === "OUTBOUND" && <><span className="ml-1" title={{ SENDING: "পাঠানো হচ্ছে", SENT: "পাঠানো হয়েছে", DELIVERED: "পৌঁছেছে", READ: "পড়া হয়েছে", FAILED: "পাঠানো যায়নি" }[message.deliveryStatus] || "পাঠানো হয়েছে"}>{message.deliveryStatus === "SENDING" || message.deliveryStatus === "SENT" ? <Clock3 size={13} /> : message.deliveryStatus === "FAILED" ? <CircleAlert size={14} className="text-red-200" /> : message.deliveryStatus === "READ" ? <CheckCheck size={15} className="text-sky-200" /> : <Check size={14} />}</span>{message.deliveryStatus === "FAILED" && canUpdate && <button type="button" disabled={busy} onClick={() => retryReply(message.id)} className="ml-1 inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 font-semibold hover:bg-white/25 disabled:opacity-50"><RotateCw size={11} />Retry</button>}</>}</p></div></div>)}
            </div>
            <form onSubmit={sendReply} className="border-t border-border p-3 sm:p-4"><div className="flex items-end gap-2"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={4000} disabled={!canUpdate || conversation.status === "CLOSED"} placeholder={conversation.status === "CLOSED" ? "Reply দিতে conversation reopen করুন" : canUpdate ? "Reply লিখুন…" : "আপনার chat:update permission নেই"} className="min-h-11 flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none focus:border-brand disabled:opacity-50" /><button type="submit" disabled={!canUpdate || busy || !draft.trim() || conversation.status === "CLOSED"} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 font-semibold text-white disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <Send size={17} />}<span className="hidden sm:inline">Send</span></button></div><p className="mt-2 text-[11px] text-text-muted">Website reply visitor-এর chat-এ যাবে; Meta reply সংশ্লিষ্ট WhatsApp বা Messenger channel-এ পাঠানো হবে।</p></form>
          </> : <div className="grid flex-1 place-items-center p-8 text-center text-text-muted"><div><UserRound className="mx-auto mb-3 h-10 w-10 opacity-40" /><p>একটি conversation বেছে নিন</p></div></div>}
        </div>
      </section>
    </main>
  );
}
