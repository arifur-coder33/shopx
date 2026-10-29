"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ChevronDown, ExternalLink, LoaderCircle, MessageCircle, Send } from "lucide-react";
import { sendFacebookPageCommentPrivateReplyAction } from "@/backend/serverActions/chatActions";

const dateLabel = (value) => value ? new Date(value).toLocaleString("bn-BD", { dateStyle: "medium", timeStyle: "short" }) : "সময় পাওয়া যায়নি";
const statusLabel = (status) => ({ REPLIED: "পাবলিক রিপ্লাই গেছে", PENDING: "রিপ্লাই অপেক্ষায়", PROCESSING: "রিপ্লাই তৈরি হচ্ছে", SKIPPED: "AI রিপ্লাই দেয়নি", FAILED: "রিপ্লাই ব্যর্থ" }[status] || status || "অজানা");

export default function FacebookCommentsPage({ initialComments = [], initialError = "", canUpdate = false }) {
  const [comments, setComments] = useState(initialComments);
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [expandedIds, setExpandedIds] = useState({});

  async function sendPrivateReply(comment) {
    setBusyId(comment.id);
    setNotice("");
    const message = (drafts[comment.id] || "আপনার comment-এর জন্য ধন্যবাদ! পণ্যের বিস্তারিত জানতে চাইলে এখানে জানাতে পারেন।").trim();
    const result = await sendFacebookPageCommentPrivateReplyAction(comment.id, message);
    setBusyId("");
    if (!result.success) { setNotice(result.message || "Inbox reply পাঠানো যায়নি।"); return; }
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, privateReplyStatus: "SENT", privateReplyText: message, privateReplyAt: result.data.privateReplyAt || new Date(), privateReplyInboxSaved: result.data.privateReplyInboxSaved } : item));
    setNotice(result.data.privateReplyInboxSaved ? "Commenter-কে private reply পাঠানো হয়েছে এবং Messenger Inbox-এ সংরক্ষণ করা হয়েছে।" : "Private reply পাঠানো হয়েছে, তবে app-এর Inbox-এ save করা যায়নি।");
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/chat" className="rounded-lg border border-border p-2 text-text hover:bg-background" aria-label="Chat inbox"><ArrowLeft className="h-4 w-4" /></Link>
          <div><h1 className="text-xl font-bold text-text">Facebook Page Comments</h1><p className="text-sm text-text-muted">Comment-এর সঙ্গে public auto-reply এবং inbox private reply history</p></div>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-sm text-text-muted">শেষ ১০০টি comment</span>
      </header>

      {initialError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{initialError}</div>}
      {notice && <div className="rounded-lg border border-border bg-background p-3 text-sm text-text">{notice}</div>}
      {!comments.length && <div className="rounded-xl border border-border bg-surface p-10 text-center text-text-muted">এখনো কোনো Facebook comment webhook-এ আসেনি। নতুন comment এলে এখানে দেখা যাবে।</div>}

      <section className="space-y-4">
        {comments.map((comment) => {
          const isSent = comment.privateReplyStatus === "SENT" || Boolean(comment.privateReplyAt);
          const tooOld = comment.commentCreatedAt && Date.now() - new Date(comment.commentCreatedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
          const expanded = Boolean(expandedIds[comment.id]);
          const privateSummary = isSent ? " · Inbox message পাঠানো হয়েছে" : comment.privateReplyStatus === "FAILED" ? " · Inbox reply ব্যর্থ" : "";
          return <article key={comment.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <button type="button" aria-expanded={expanded} onClick={() => setExpandedIds((current) => ({ ...current, [comment.id]: !current[comment.id] }))} className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-background/70 sm:p-4">
              <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-text">{comment.authorName || "Facebook user"}</span><span className={`rounded-full px-2 py-0.5 text-[11px] ${comment.status === "REPLIED" ? "bg-emerald-50 text-emerald-700" : comment.status === "FAILED" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{statusLabel(comment.status)}{privateSummary}</span></span><span className="mt-1 block truncate text-sm text-text">{comment.commentText}</span><span className="mt-1 block text-xs text-text-muted">{dateLabel(comment.commentCreatedAt || comment.createdAt)}{comment.replyText ? ` · Reply: ${comment.replyText.slice(0, 90)}` : ""}</span></span>
              <ChevronDown className={`h-5 w-5 shrink-0 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
            {expanded && <div className="space-y-3 border-t border-border p-3 sm:p-4">
              <div className="flex justify-end">{comment.postId && <a className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-1 text-xs text-text-muted hover:text-text" href={`https://www.facebook.com/${encodeURIComponent(comment.postId)}`} target="_blank" rel="noreferrer">Post <ExternalLink className="h-3 w-3" /></a>}</div>
              <div className="rounded-lg bg-background p-3"><p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">Customer comment</p><p className="whitespace-pre-wrap text-sm text-text">{comment.commentText}</p></div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3"><p className="mb-1 text-xs font-semibold text-emerald-800">Public auto-reply · {comment.repliedAt ? dateLabel(comment.repliedAt) : statusLabel(comment.status)}</p><p className="whitespace-pre-wrap text-sm text-text">{comment.replyText || (comment.status === "FAILED" ? `পাবলিক reply পাঠানো যায়নি (${comment.errorCode || "error"})` : comment.status === "SKIPPED" ? "AI এই comment-এ reply এড়িয়ে গেছে।" : "এখনো public reply তৈরি হয়নি।")}</p></div>
              <div className="rounded-lg border border-border p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text"><MessageCircle className="h-4 w-4" /> Messenger private reply</div>
                {isSent ? <div className="rounded-lg bg-background p-3"><p className="mb-1 text-xs font-semibold text-emerald-700">পাঠানো হয়েছে · {dateLabel(comment.privateReplyAt)}{comment.privateReplyInboxSaved ? " · Messenger inbox-এ সংরক্ষিত" : " · App inbox-এ সংরক্ষণ হয়নি"}</p><p className="whitespace-pre-wrap text-sm text-text">{comment.privateReplyText}</p></div> : comment.privateReplyStatus === "PROCESSING" ? <p className="text-sm text-text-muted">Private reply পাঠানো হচ্ছে…</p> : <>
                  {comment.privateReplyStatus === "FAILED" && <p className="mb-2 text-sm text-red-700">আগের চেষ্টা ব্যর্থ: {comment.privateReplyError || "Meta reply গ্রহণ করেনি।"}</p>}
                  {canUpdate ? <div className="space-y-2"><textarea value={drafts[comment.id] ?? "আপনার comment-এর জন্য ধন্যবাদ! পণ্যের বিস্তারিত জানতে চাইলে এখানে জানাতে পারেন।"} onChange={(event) => setDrafts((current) => ({ ...current, [comment.id]: event.target.value }))} maxLength={1000} rows={2} disabled={Boolean(tooOld) || busyId === comment.id} className="w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm text-text outline-none focus:border-brand disabled:opacity-60" />
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-text-muted">Meta-র নিয়মে একটি comment-এ ৭ দিনের মধ্যে একবার private reply পাঠানো যায়.</p><button type="button" onClick={() => sendPrivateReply(comment)} disabled={Boolean(tooOld) || busyId === comment.id} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busyId === comment.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{tooOld ? "৭ দিনের সময়সীমা শেষ" : busyId === comment.id ? "পাঠাচ্ছি…" : "ইনবক্সে private reply পাঠান"}</button></div>
                  </div> : <p className="text-sm text-text-muted">আপনার account-এ chat update permission নেই।</p>}
                </>}
              </div>
            </div>}
          </article>;
        })}
      </section>
    </main>
  );
}
