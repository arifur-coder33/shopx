import prisma from "@/lib/prisma";
import { generateFacebookCommentReply } from "@/backend/services/chat/aiReplyService";

export async function saveFacebookPageComment({ commentId, pageId, postId, authorId, authorName, commentText, commentCreatedAt }) {
  if (!commentId || !pageId || !commentText) return false;
  const result = await prisma.facebookPageCommentReply.createMany({
    data: [{
      commentId: String(commentId).slice(0, 120),
      pageId: String(pageId).slice(0, 80),
      ...(postId && { postId: String(postId).slice(0, 120) }),
      ...(authorId && { authorId: String(authorId).slice(0, 80) }),
      ...(authorName && { authorName: String(authorName).slice(0, 150) }),
      commentText: String(commentText).slice(0, 1500),
      ...(commentCreatedAt instanceof Date && !Number.isNaN(commentCreatedAt.getTime()) && { commentCreatedAt }),
    }],
    skipDuplicates: true,
  });
  return result.count > 0;
}

export async function sendFacebookPageCommentPrivateReply({ id, message, credentials, authorId = null }) {
  const comment = await prisma.facebookPageCommentReply.findUnique({ where: { id } });
  if (!comment) throw new Error("Facebook comment পাওয়া যায়নি।");
  if (comment.privateReplyAt || comment.privateReplyStatus === "SENT") throw new Error("এই comment-এর জন্য private inbox reply আগেই পাঠানো হয়েছে।");
  if (comment.privateReplyStatus === "PROCESSING") throw new Error("এই comment-এর private reply পাঠানো হচ্ছে।");
  if (String(comment.pageId) !== String(credentials.messengerPageId || "")) throw new Error("এই comment বর্তমান Facebook Page-এর নয়।");
  if (comment.authorId && String(comment.authorId) === String(comment.pageId)) throw new Error("নিজের Page-এর comment-এ inbox reply পাঠানো যাবে না।");
  if (comment.commentCreatedAt && Date.now() - comment.commentCreatedAt.getTime() > 7 * 24 * 60 * 60 * 1000) throw new Error("Meta-এর নিয়ম অনুযায়ী comment-এর ৭ দিনের মধ্যে private reply পাঠাতে হয়।");
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const token = credentials.messengerPageAccessToken;
  if (!token || !/^v\d+\.\d+$/.test(version || "")) throw new Error("Facebook Page credentials configure করা নেই।");
  const reply = String(message || "").trim().slice(0, 1000);
  if (!reply) throw new Error("Inbox message লিখুন।");
  const claimed = await prisma.facebookPageCommentReply.updateMany({
    where: { id, privateReplyAt: null, privateReplyStatus: comment.privateReplyStatus },
    data: { privateReplyStatus: "PROCESSING", privateReplyError: null },
  });
  if (!claimed.count) throw new Error("এই comment-এ private reply-এর অবস্থা বদলেছে। পেজটি refresh করে দেখুন।");
  try {
    const check = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(comment.commentId)}?fields=can_reply_privately`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const eligibility = await check.json().catch(() => ({}));
    if (!check.ok) {
      const error = new Error(eligibility?.error?.message || "Comment private reply eligibility যাচাই করা যায়নি।");
      error.code = eligibility?.error?.code || `meta_http_${check.status}`;
      throw error;
    }
    if (eligibility.can_reply_privately === false) throw new Error("Meta এই comment-এ private reply অনুমোদন করছে না—সময়সীমা শেষ বা reply আগেই পাঠানো হয়েছে।");
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(credentials.messengerPageId)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { comment_id: comment.commentId }, messaging_type: "RESPONSE", message: { text: reply } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.message_id) {
      const error = new Error(String(result?.error?.message || "Facebook inbox message পাঠানো যায়নি।").slice(0, 180));
      error.code = result?.error?.code || `meta_http_${response.status}`;
      throw error;
    }
    const savedComment = await prisma.facebookPageCommentReply.update({
      where: { id },
      data: { privateReplyStatus: "SENT", privateReplyText: reply, privateReplyMessageId: String(result.message_id).slice(0, 120), privateReplyAt: new Date(), privateReplyError: null },
    });
    const recipientId = String(result.recipient_id || comment.authorId || "").slice(0, 120);
    let inboxSaved = false;
    if (recipientId) {
      try {
        await prisma.$transaction(async (tx) => {
          const conversation = await tx.chatConversation.upsert({
            where: { channel_externalUserId: { channel: "MESSENGER", externalUserId: recipientId } },
            create: { channel: "MESSENGER", externalUserId: recipientId, customerName: comment.authorName || null, status: "OPEN", lastMessageAt: new Date() },
            update: { ...(comment.authorName && { customerName: comment.authorName }), status: "OPEN", lastMessageAt: new Date() },
            select: { id: true },
          });
          await tx.chatMessage.createMany({
            data: [{
              conversationId: conversation.id,
              channel: "MESSENGER",
              direction: "OUTBOUND",
              authorType: "AGENT",
              authorId,
              content: reply,
              externalMessageId: String(result.message_id).slice(0, 120),
              deliveryStatus: "SENT",
              metadata: { source: "FACEBOOK_COMMENT_PRIVATE_REPLY", commentId: comment.commentId, postId: comment.postId || null },
            }],
            skipDuplicates: true,
          });
        });
        inboxSaved = true;
        await prisma.facebookPageCommentReply.update({ where: { id }, data: { privateReplyInboxSaved: true } });
      } catch (inboxError) {
        console.error("Facebook comment private reply inbox save failed:", { commentId: comment.commentId, message: inboxError?.message || "unknown_error" });
      }
    } else {
      console.error("Facebook comment private reply has no Messenger recipient id:", { commentId: comment.commentId });
    }
    return { ...savedComment, privateReplyInboxSaved: inboxSaved };
  } catch (error) {
    const safeError = String(error?.message || "Facebook inbox reply failed").slice(0, 300);
    await prisma.facebookPageCommentReply.update({ where: { id }, data: { privateReplyStatus: "FAILED", privateReplyError: safeError } }).catch(() => {});
    throw error;
  }
}

export async function processFacebookPageComment({ commentId, pageId, postId, authorName, commentText, credentials }) {
  const claimed = await prisma.facebookPageCommentReply.updateMany({
    where: { commentId, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
  if (!claimed.count) return;
  try {
    const reply = await generateFacebookCommentReply({ commentText, postId, authorName });
    if (!reply) {
      await prisma.facebookPageCommentReply.update({ where: { commentId }, data: { status: "SKIPPED" } });
      return;
    }
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    if (!credentials.messengerPageAccessToken || !/^v\d+\.\d+$/.test(version || "")) throw new Error("facebook_comment_credentials_missing");
    const response = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(commentId)}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ message: reply }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.id) {
      const error = new Error(String(result?.error?.message || "facebook_comment_reply_failed").slice(0, 180));
      error.code = result?.error?.code || `meta_http_${response.status}`;
      throw error;
    }
    await prisma.facebookPageCommentReply.update({
      where: { commentId },
      data: { status: "REPLIED", replyText: reply, replyCommentId: String(result.id).slice(0, 120), repliedAt: new Date(), errorCode: null },
    });
  } catch (error) {
    const code = String(error?.code || error?.message || "facebook_comment_reply_failed").slice(0, 100);
    await prisma.facebookPageCommentReply.update({ where: { commentId }, data: { status: "FAILED", errorCode: code } }).catch(() => {});
    console.error("Facebook Page comment auto-reply failed:", { pageId, commentId, code });
  }
}
