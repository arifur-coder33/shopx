import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { maybeSendChatAiReply } from "@/backend/services/chatAiReplyService";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function getTikTokSettings() {
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { encryptedCredentials: true, tiktokEnabled: true } });
  const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
  return { enabled: setting?.tiktokEnabled ?? false, credentials };
}

function hasValidSignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((part) => part.trim().split("=", 2)));
  const timestamp = parts.t;
  const supplied = Buffer.from(parts.s || "", "hex");
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!timestamp || !Number.isFinite(ageSeconds) || ageSeconds > 300 || supplied.length !== 32) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  return timingSafeEqual(supplied, expected);
}

function parseContent(content) {
  if (typeof content !== "string") return content || {};
  try { return JSON.parse(content); } catch { return {}; }
}

async function saveTikTokMessage(envelope) {
  if (!envelope || !String(envelope.event || "").startsWith("im_receive_message")) return;
  const content = parseContent(envelope.content);
  const message = content.message || content;
  const conversationId = content.conversation_id || content.conversation_short_id || message.conversation_id || message.conversation_short_id;
  const messageId = message.message_id || message.server_message_id || message.id || content.message_id || content.server_message_id;
  if (!conversationId || !messageId) return;
  const sender = message.from_user || content.from_user || message.sender_info || content.sender_info || {};
  const customerName = sender.display_name || sender.username || sender.nickname || null;
  const profilePicUrl = sender.profile_image || sender.profile_image_url || sender.avatar_url || null;
  const messageType = message.message_type || message.msg_type || message.type || content.message_type || "TEXT";
  const rawText = message.text?.body || message.text || message.content?.text || message.body || content.text?.body || content.text || content.message_content?.text || "";
  const mediaUrl = message.image?.url || message.image_url || content.image?.url || content.image_url || null;
  const mediaId = message.image?.media_id || message.image?.mediaId || content.image?.media_id || content.media_id || null;
  const audioUrl = message.audio?.url || message.audio_url || message.voice?.url || message.voice_url || content.audio?.url || content.audio_url || message.attachment?.url || null;
  const audioId = message.audio?.media_id || message.audio?.mediaId || message.voice?.media_id || content.audio?.media_id || null;
  const audioMimeType = message.audio?.mime_type || message.voice?.mime_type || content.audio?.mime_type || "audio/mpeg";
  const text = String(rawText || (mediaUrl ? "📷 Photo" : `[TikTok ${messageType} message]`)).slice(0, 4000);
  const normalizedAttachments = [
    ...(mediaUrl ? [{ type: "image", payload: { url: mediaUrl } }] : []),
    ...(audioUrl ? [{ type: "audio", payload: { url: audioUrl, mime_type: audioMimeType } }] : []),
  ];
  const timestamp = message.timestamp || content.timestamp || envelope.create_time;
  const createdAt = Number(timestamp) ? new Date(Number(timestamp) < 10_000_000_000 ? Number(timestamp) * 1000 : Number(timestamp)) : new Date();
  const conversation = await prisma.chatConversation.upsert({
    where: { channel_externalUserId: { channel: "TIKTOK", externalUserId: String(conversationId) } },
    create: { channel: "TIKTOK", externalUserId: String(conversationId), customerName, profilePicUrl, lastMessageAt: createdAt },
    update: { ...(customerName && { customerName }), ...(profilePicUrl && { profilePicUrl }), lastMessageAt: createdAt, status: "OPEN" },
    select: { id: true },
  });
  // TikTok payload versions use different names for the message being quoted.
  const replyToExternalMessageId = message.reply_to?.message_id
    || message.reply_to?.id
    || message.reply_to_message_id
    || message.reply_message_id
    || message.quoted_message_id
    || message.in_reply_to_message_id
    || content.reply_to?.message_id
    || content.reply_to_message_id
    || null;
  let replyTo = null;
  if (replyToExternalMessageId) {
    const quoted = await prisma.chatMessage.findFirst({
      where: { conversationId: conversation.id, channel: "TIKTOK", externalMessageId: String(replyToExternalMessageId) },
      select: { id: true, content: true, direction: true, authorType: true, metadata: true },
    });
    if (quoted) {
      const productId = quoted.metadata?.image?.productId
        || quoted.metadata?.selectedProductId
        || (quoted.metadata?.productOptions?.length === 1 ? quoted.metadata.productOptions[0].id : null);
      replyTo = { id: quoted.id, content: quoted.content.slice(0, 300), direction: quoted.direction, authorType: quoted.authorType, ...(productId && { productId }) };
    } else replyTo = { content: "Replied to an earlier message" };
  }
  const inserted = await prisma.chatMessage.createMany({
    data: [{ conversationId: conversation.id, channel: "TIKTOK", direction: "INBOUND", authorType: "CUSTOMER", content: text, externalMessageId: String(messageId), deliveryStatus: "DELIVERED", metadata: { type: messageType, timestamp, ...(replyTo && { replyTo }), ...(mediaId && { image: { mediaId: String(mediaId), mimeType: "image/jpeg", conversationId: String(conversationId) } }), ...(audioId && { audio: { mediaId: String(audioId), mimeType: audioMimeType } }), ...(normalizedAttachments.length && { attachments: normalizedAttachments }) } }],
    skipDuplicates: true,
  });
  await prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: createdAt, ...(inserted.count > 0 && { unreadCount: { increment: inserted.count } }) } });
  if (inserted.count > 0) {
    const inbound = await prisma.chatMessage.findFirst({ where: { conversationId: conversation.id, channel: "TIKTOK", externalMessageId: String(messageId) }, select: { id: true } });
    after(async () => {
      await Promise.allSettled([
        sendChatPushNotification({ conversationId: conversation.id, channel: "TIKTOK", customerName, content: text }),
        inbound ? maybeSendChatAiReply(conversation.id, inbound.id) : Promise.resolve(),
      ]);
    });
  }
}

export async function POST(request) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response("Webhook payload is too large", { status: 413 });
  let settings;
  try { settings = await getTikTokSettings(); } catch { return new Response("Webhook is not configured", { status: 503 }); }
  const { enabled, credentials } = settings;
  if (!enabled || !credentials.tiktokClientKey || !credentials.tiktokClientSecret) return new Response("TikTok inbox is not enabled", { status: 404 });
  if (!hasValidSignature(rawBody, request.headers.get("tiktok-signature"), credentials.tiktokClientSecret)) return new Response("Invalid signature", { status: 401 });
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (payload.client_key && payload.client_key !== credentials.tiktokClientKey) return new Response("Invalid client key", { status: 401 });
  try {
    const events = Array.isArray(payload) ? payload : Array.isArray(payload.events) ? payload.events : [payload];
    for (const event of events) await saveTikTokMessage(event);
    return Response.json({ success: true });
  } catch (error) {
    console.error("TikTok chat webhook processing failed:", error?.message || error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
