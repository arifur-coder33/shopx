"use client";

import { getChatRealtimeTokenAction } from "@/backend/serverActions/chatActions";
import {
  deleteEmailDraftAction,
  getEmailConversationAction,
  getEmailSupportFolderAction,
  getEmailSupportInboxAction,
  saveEmailDraftAction,
  sendEmailSupportMessageAction,
} from "@/backend/serverActions/emailSupportAction";
import { Bell, ChevronDown, Download, FileText, Inbox, Mail, Paperclip, PenLine, RefreshCw, Send, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const dateLabel = (value) => new Intl.DateTimeFormat("bn-BD", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
const folderNames = { inbox: "Inbox", sent: "Sent", drafts: "Drafts" };

function AttachmentList({ message }) {
  if (!message.attachments?.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2">{message.attachments.map((file) => {
    const url = `/api/admin/support/email/${encodeURIComponent(message.id)}/attachments/${encodeURIComponent(file.id)}`;
    return <a key={file.id} href={url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-text hover:bg-surface-muted" title={`${file.filename} · ${Math.ceil(file.size / 1024)} KB`}>
      {/^(application\/pdf|image\/)/i.test(file.mimeType) ? <FileText size={15} className="shrink-0" /> : <Download size={15} className="shrink-0" />}
      <span className="max-w-52 truncate">{file.filename}</span><Download size={13} className="shrink-0 text-text-muted" />
    </a>;
  })}</div>;
}

function FolderSection({ folder, count, active, expanded, onToggle, children }) {
  const Icon = folder === "inbox" ? Inbox : folder === "sent" ? Send : FileText;
  return <section className="border-b border-border last:border-0">
    <button type="button" onClick={onToggle} aria-expanded={expanded} className={`flex w-full items-center gap-2 px-3 py-3 text-left text-sm font-semibold ${active ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted"}`}>
      <Icon size={17} /><span className="flex-1">{folderNames[folder]}</span><span className="text-xs text-text-muted">{count}</span><ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
    </button>
    {expanded && <div className="pb-1">{children}</div>}
  </section>;
}

export default function EmailSupportInbox({ canUpdate }) {
  const [conversations, setConversations] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [folder, setFolder] = useState("inbox");
  const [expanded, setExpanded] = useState({ inbox: true, sent: false, drafts: false });
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [composer, setComposer] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState("default");
  const [realtimeStatus, setRealtimeStatus] = useState("connecting");
  const [busy, startTransition] = useTransition();
  const selectedIdRef = useRef("");
  const notifiedIds = useRef(new Set());
  const composerForm = useRef(null);
  const newFilesInput = useRef(null);

  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

  const loadInbox = useCallback(async () => {
    const result = await getEmailSupportInboxAction();
    if (!result.success) { setError(result.message); return; }
    setConversations(result.data || []);
    setError("");
  }, []);

  const loadFolder = useCallback(async (name) => {
    if (name === "inbox") return loadInbox();
    const result = await getEmailSupportFolderAction(name);
    if (!result.success) { setError(result.message); return; }
    if (name === "sent") setSentItems(result.data || []);
    if (name === "drafts") setDrafts(result.data || []);
    setError("");
  }, [loadInbox]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadInbox(), getEmailSupportFolderAction("sent").then((result) => result.success && setSentItems(result.data || [])), getEmailSupportFolderAction("drafts").then((result) => result.success && setDrafts(result.data || []))]);
  }, [loadInbox]);

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    loadAll();
    let closed = false;
    let socket;
    let reconnectTimer;
    let reconnectDelay = 1000;
    const connect = async () => {
      const tokenResult = await getChatRealtimeTokenAction();
      if (closed) return;
      if (!tokenResult.success || !tokenResult.token) {
        setRealtimeStatus("disconnected");
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${protocol}//${window.location.host}/api/chat/socket`);
      socket.addEventListener("open", () => socket?.send(JSON.stringify({ type: "auth", token: tokenResult.token })));
      socket.addEventListener("message", async (messageEvent) => {
        let packet;
        try { packet = JSON.parse(messageEvent.data); } catch { return; }
        if (packet.event === "realtime:connected") { reconnectDelay = 1000; setRealtimeStatus("connected"); }
        if (packet.event === "email.received") {
          const event = packet.payload || {};
          await loadInbox();
          if (selectedIdRef.current === event.conversationId) {
            const result = await getEmailConversationAction(event.conversationId);
            if (result.success) setConversation(result.data);
          }
          if (permission === "granted" && "Notification" in window && event.emailId && !notifiedIds.current.has(event.emailId)) {
            notifiedIds.current.add(event.emailId);
            new Notification("নতুন customer email", { body: `${event.customerEmail || ""} · ${event.subject || ""}`, tag: event.emailId });
          }
        }
      });
      socket.addEventListener("close", () => {
        setRealtimeStatus("disconnected");
        if (!closed) { reconnectTimer = window.setTimeout(connect, reconnectDelay); reconnectDelay = Math.min(reconnectDelay * 2, 15000); }
      });
      socket.addEventListener("error", () => socket?.close());
    };
    connect();
    return () => { closed = true; window.clearTimeout(reconnectTimer); socket?.close(); };
  }, [loadAll, loadInbox, permission]);

  const selectConversation = async (id) => {
    setSelectedId(id);
    setComposer(null);
    setNewFiles([]);
    const result = await getEmailConversationAction(id);
    if (!result.success) { setError(result.message); return; }
    setConversation(result.data);
    setConversations((rows) => rows.map((row) => row.id === id ? { ...row, unreadCount: 0 } : row));
  };

  const startNewEmail = () => {
    setFolder("inbox");
    setConversation(null);
    setSelectedId("");
    setNewFiles([]);
    setComposer({ draftId: "", conversationId: "", toEmail: "", subject: "", message: "", attachments: [] });
  };

  const openDraft = (draft) => {
    setFolder("drafts");
    setExpanded((previous) => ({ ...previous, drafts: true }));
    setConversation(null);
    setSelectedId("");
    setNewFiles([]);
    setComposer({ draftId: draft.id, conversationId: draft.conversationId || "", toEmail: draft.toEmail || "", subject: draft.subject || "", message: draft.textBody || "", attachments: draft.attachments || [] });
  };

  const openSentItem = (item) => selectConversation(item.conversationId);

  const toggleFolder = (name) => {
    setFolder(name);
    setExpanded((previous) => ({ ...previous, [name]: !previous[name] }));
    setComposer(null);
    setNewFiles([]);
    setConversation(null);
    setSelectedId("");
    loadFolder(name);
  };

  const saveDraft = () => {
    if (!composerForm.current || !canUpdate || busy) return;
    const formData = new FormData(composerForm.current);
    startTransition(async () => {
      const result = await saveEmailDraftAction(formData);
      if (!result.success) { setError(result.message); return; }
      const refreshed = await getEmailSupportFolderAction("drafts");
      if (refreshed.success) {
        setDrafts(refreshed.data || []);
        const saved = refreshed.data.find((item) => item.id === result.id);
        if (saved) openDraft(saved);
      }
      setNotice("Draft saved."); setError("");
    });
  };

  const saveReplyDraft = (form) => {
    if (!form || !canUpdate || busy) return;
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveEmailDraftAction(formData);
      if (!result.success) { setError(result.message); return; }
      const refreshed = await getEmailSupportFolderAction("drafts");
      if (refreshed.success) {
        setDrafts(refreshed.data || []);
        const saved = refreshed.data.find((item) => item.id === result.id);
        if (saved) openDraft(saved);
      }
      setNotice("Draft saved."); setError("");
    });
  };

  const sendEmail = (event) => {
    event.preventDefault();
    if (!canUpdate || busy) return;
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await sendEmailSupportMessageAction(formData);
      if (!result.success) { setError(result.message); setNotice(""); return; }
      setNotice(result.message); setError(""); setComposer(null); setNewFiles([]);
      setFolder("sent");
      setExpanded((previous) => ({ ...previous, sent: true }));
      await loadAll();
      if (result.conversationId) await selectConversation(result.conversationId);
    });
  };

  const deleteDraft = () => {
    if (!composer?.draftId || busy || !window.confirm("এই draft মুছে ফেলবেন?")) return;
    startTransition(async () => {
      const result = await deleteEmailDraftAction(composer.draftId);
      if (!result.success) { setError(result.message); return; }
      setComposer(null); setNotice("Draft deleted."); await loadFolder("drafts");
    });
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    setPermission(await Notification.requestPermission());
  };

  const removeNewFile = (index) => {
    const remaining = newFiles.filter((_, fileIndex) => fileIndex !== index);
    if (newFilesInput.current) {
      const transfer = new DataTransfer();
      remaining.forEach((file) => transfer.items.add(file));
      newFilesInput.current.files = transfer.files;
    }
    setNewFiles(remaining);
  };

  const folderCounts = {
    inbox: conversations.reduce((total, row) => total + (row.unreadCount || 0), 0),
    sent: sentItems.length,
    drafts: drafts.length,
  };
  const visibleFiles = [...(composer?.attachments || []), ...newFiles.map((file, index) => ({ id: `new-${index}-${file.name}`, filename: file.name, size: file.size, isNew: true, index }))];

  return <div className="flex h-[calc(100dvh-5rem)] min-h-[560px] flex-col p-3 sm:p-5">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold text-text">Customer Email</h1><p className="text-xs text-text-muted">{realtimeStatus === "connected" ? "নতুন email এলেই live update হবে" : realtimeStatus === "connecting" ? "Live inbox সংযোগ হচ্ছে…" : "Live inbox সংযোগ নেই · দরকার হলে Refresh করুন"}</p></div>
      <div className="flex gap-2"><button onClick={enableNotifications} type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"><Bell size={15} />{permission === "granted" ? "Notification on" : "Notification"}</button><button onClick={loadAll} type="button" className="rounded-lg border border-border p-2" aria-label="Refresh email folders"><RefreshCw size={16} /></button><Link href="/admin/settings/email" className="button text-xs">Email settings</Link></div>
    </header>
    {(error || notice) && <p className={`mb-2 rounded-lg p-2 text-sm ${error ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"}`}>{error || notice}</p>}

    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,38%)_minmax(0,1fr)] overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-[minmax(250px,340px)_1fr] md:grid-rows-1">
      <aside className="flex min-h-0 flex-col overflow-y-auto border-b border-border md:border-b-0 md:border-r">
        {canUpdate && <button type="button" onClick={startNewEmail} className="m-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white"><PenLine size={16} />নতুন email লিখুন</button>}
        <FolderSection folder="inbox" count={folderCounts.inbox || conversations.length} active={folder === "inbox"} expanded={expanded.inbox} onToggle={() => toggleFolder("inbox")}>
          {conversations.length ? conversations.map((item) => <button type="button" key={item.id} onClick={() => selectConversation(item.id)} className={`w-full border-t border-border/70 px-3 py-3 text-left hover:bg-surface-muted ${item.id === selectedId ? "bg-primary/10" : ""}`}><span className="flex items-center justify-between gap-2"><strong className="truncate text-sm text-text">{item.customerEmail}</strong>{item.unreadCount > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{item.unreadCount}</span>}</span><span className="mt-1 block truncate text-xs font-semibold text-text">{item.subject}</span><span className="mt-1 block truncate text-xs text-text-muted">{item.messages?.[0]?.textBody || "(No message body)"}</span><span className="mt-1 block text-[10px] text-text-muted">{dateLabel(item.lastMessageAt)}</span></button>) : <div className="px-4 py-5 text-sm text-text-muted">ইমেইল এখনো আসেনি। Receiving address ও webhook <Link href="/admin/settings/email" className="text-primary underline">configure করুন</Link>.</div>}
        </FolderSection>
        <FolderSection folder="sent" count={folderCounts.sent} active={folder === "sent"} expanded={expanded.sent} onToggle={() => toggleFolder("sent")}>
          {sentItems.length ? sentItems.map((item) => <button type="button" key={item.id} onClick={() => openSentItem(item)} className="w-full border-t border-border/70 px-3 py-3 text-left hover:bg-surface-muted"><strong className="block truncate text-sm text-text">To: {item.toEmail}</strong><span className="mt-1 block truncate text-xs font-semibold text-text">{item.subject}</span><span className="mt-1 block truncate text-xs text-text-muted">{item.textBody}</span><span className="mt-1 block text-[10px] text-text-muted">{dateLabel(item.createdAt)}{item.attachments.length ? ` · ${item.attachments.length} file` : ""}</span></button>) : <p className="px-4 py-4 text-xs text-text-muted">Sent email নেই।</p>}
        </FolderSection>
        <FolderSection folder="drafts" count={folderCounts.drafts} active={folder === "drafts"} expanded={expanded.drafts} onToggle={() => toggleFolder("drafts")}>
          {drafts.length ? drafts.map((item) => <button type="button" key={item.id} onClick={() => openDraft(item)} className={`w-full border-t border-border/70 px-3 py-3 text-left hover:bg-surface-muted ${composer?.draftId === item.id ? "bg-primary/10" : ""}`}><strong className="block truncate text-sm text-text">{item.toEmail || "প্রাপক দেওয়া হয়নি"}</strong><span className="mt-1 block truncate text-xs font-semibold text-text">{item.subject || "(No subject)"}</span><span className="mt-1 block truncate text-xs text-text-muted">{item.textBody || "(Empty draft)"}</span><span className="mt-1 block text-[10px] text-text-muted">{dateLabel(item.updatedAt)}{item.attachments.length ? ` · ${item.attachments.length} file` : ""}</span></button>) : <p className="px-4 py-4 text-xs text-text-muted">Draft নেই।</p>}
        </FolderSection>
      </aside>

      <main className="flex min-h-0 flex-col overflow-hidden">
        {composer ? <form ref={composerForm} onSubmit={sendEmail} className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border p-4"><div><h2 className="font-bold text-text">{composer.conversationId ? "Reply email" : "নতুন email"}</h2><p className="text-xs text-text-muted">ফাইলসহ সর্বোচ্চ ৪ MB attachment পাঠানো যাবে।</p></div><button type="button" onClick={() => setComposer(null)} className="rounded-lg p-2 hover:bg-surface-muted" aria-label="Close compose"><X size={18} /></button></div>
          <input type="hidden" name="draftId" value={composer.draftId || ""} /><input type="hidden" name="conversationId" value={composer.conversationId || ""} /><input type="hidden" name="keepAttachmentIds" value={JSON.stringify((composer.attachments || []).map((file) => file.id))} />
          <div className="space-y-3 border-b border-border p-4"><label className="block text-xs font-semibold text-text">প্রাপক<input name="toEmail" type="email" required value={composer.toEmail} onChange={(event) => setComposer((value) => ({ ...value, toEmail: event.target.value }))} disabled={Boolean(composer.conversationId)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="customer@example.com" /></label><label className="block text-xs font-semibold text-text">Subject<input name="subject" required={!composer.conversationId} value={composer.subject} onChange={(event) => setComposer((value) => ({ ...value, subject: event.target.value }))} disabled={Boolean(composer.conversationId)} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Email subject" /></label></div>
          <textarea name="message" required maxLength={20000} value={composer.message} onChange={(event) => setComposer((value) => ({ ...value, message: event.target.value }))} className="min-h-40 flex-1 resize-y bg-background p-4 text-sm text-text outline-none" placeholder="আপনার email লিখুন…" />
          <div className="border-t border-border p-3">
            <div className="mb-3 flex flex-wrap gap-2">{visibleFiles.map((file) => <span key={file.id} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-text"><Paperclip size={13} /><span className="max-w-48 truncate">{file.filename}</span><button type="button" aria-label={`${file.filename} সরান`} onClick={() => file.isNew ? removeNewFile(file.index) : setComposer((value) => ({ ...value, attachments: value.attachments.filter((item) => item.id !== file.id) }))}><X size={13} /></button></span>)}</div>
            <div className="flex flex-wrap items-center justify-between gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-surface-muted"><Paperclip size={15} />ফাইল যোগ করুন<input ref={newFilesInput} name="files" type="file" multiple className="sr-only" onChange={(event) => setNewFiles(Array.from(event.target.files || []))} /></label><div className="flex gap-2">{composer.draftId && <button type="button" onClick={deleteDraft} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Draft মুছুন</button>}<button type="button" onClick={saveDraft} disabled={busy} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">{busy ? "অপেক্ষা করুন…" : "Draft রাখুন"}</button><button type="submit" disabled={busy || !canUpdate} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send size={14} />{busy ? "পাঠাচ্ছে…" : "পাঠান"}</button></div></div>
          </div>
        </form> : conversation ? <>
          <div className="border-b border-border p-4"><h2 className="font-bold text-text">{conversation.subject}</h2><p className="text-xs text-text-muted">{conversation.customerEmail}</p></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">{conversation.messages.map((item) => <article key={item.id} className={`max-w-3xl rounded-2xl p-3 ${item.direction === "OUTBOUND" ? "ml-auto bg-primary/10" : "bg-surface-muted"}`}><div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-text-muted"><strong>{item.direction === "OUTBOUND" ? "আপনি" : item.fromEmail}</strong><span>{dateLabel(item.createdAt)}</span></div><p className="whitespace-pre-wrap break-words text-sm text-text">{item.textBody}</p><AttachmentList message={item} /></article>)}</div>
          {canUpdate && <form onSubmit={sendEmail} className="border-t border-border p-3"><input type="hidden" name="conversationId" value={conversation.id} /><input type="hidden" name="draftId" value="" /><input type="hidden" name="toEmail" value={conversation.customerEmail} /><input type="hidden" name="subject" value={`Re: ${conversation.subject}`} /><input type="hidden" name="keepAttachmentIds" value="[]" /><textarea name="message" required maxLength={20000} rows={3} className="mb-2 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm text-text" placeholder="Reply লিখুন…" /><div className="flex flex-wrap items-center justify-between gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold"><Paperclip size={15} />ফাইল যোগ করুন<input ref={newFilesInput} name="files" type="file" multiple className="sr-only" onChange={(event) => setNewFiles(Array.from(event.target.files || []))} /></label><div className="flex items-center gap-2">{newFiles.length > 0 && <span className="text-xs text-text-muted">{newFiles.length} file selected</span>}<button type="button" onClick={(event) => saveReplyDraft(event.currentTarget.closest("form"))} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Draft রাখুন</button><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={16} />{busy ? "পাঠাচ্ছে…" : "পাঠান"}</button></div></div>{newFiles.length > 0 && <p className="mt-2 text-xs text-text-muted">{newFiles.map((file) => file.name).join(", ")}</p>}</form>}
        </> : <div className="grid flex-1 place-items-center p-5 text-center text-sm text-text-muted">{folder === "sent" ? "পাঠানো email খুলতে Sent section থেকে বেছে নিন।" : folder === "drafts" ? "Draft লিখতে নতুন email শুরু করুন বা Drafts section থেকে খুলুন।" : "একটি email conversation বেছে নিন অথবা নতুন email লিখুন।"}</div>}
      </main>
    </div>
  </div>;
}
