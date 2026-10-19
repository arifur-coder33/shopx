import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { normalizeChatPhone, sharedChatPhone } from "@/lib/chatIdentity";

export const dynamic = "force-dynamic";

async function getCredentials() {
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { encryptedCredentials: true, whatsappEnabled: true, messengerEnabled: true } });
  if (!setting?.encryptedCredentials) return { whatsappEnabled: setting?.whatsappEnabled ?? false, messengerEnabled: setting?.messengerEnabled ?? false };
  return { ...decryptProviderCredentials(setting.encryptedCredentials), whatsappEnabled: setting.whatsappEnabled, messengerEnabled: setting.messengerEnabled };
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  if (params.get("hub.mode") !== "subscribe") return new Response("Not found", { status: 404 });
  try {
    const credentials = await getCredentials();
    const token = params.get("hub.verify_token") || "";
    if (credentials.webhookVerifyToken && token === credentials.webhookVerifyToken) {
      return new Response(params.get("hub.challenge") || "", { status: 200 });
    }
  } catch {}
  return new Response("Forbidden", { status: 403 });
}

function hasValidSignature(rawBody, header, appSecret) {
  if (!header?.startsWith("sha256=") || !appSecret) return false;
  const supplied = Buffer.from(header.slice(7), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

async function getMessengerCustomerProfile(senderId, credentials) {
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!senderId || !credentials.messengerPageAccessToken || !/^v\d+\.\d+$/.test(version || "")) return null;
  try {
    const url = `https://graph.facebook.com/${version}/${encodeURIComponent(senderId)}?fields=first_name,middle_name,last_name,profile_pic`;
    let response = await fetch(url, {
      headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      response = await fetch(url.replace("first_name,middle_name,last_name,profile_pic", "first_name,last_name,profile_pic"), {
        headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
    }
    if (!response.ok) return null;
    const profile = await response.json();
    const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ").trim().slice(0, 150) || null;
    let profilePicUrl = null;
    try { if (new URL(profile.profile_pic).protocol === "https:") profilePicUrl = profile.profile_pic; } catch {}
    return { name, profilePicUrl };
  } catch {
    return null;
  }
}

async function saveInboundMessage({ channel, externalUserId, customerName, customerPhone, profilePicUrl, messageId, content, metadata }) {
  if (!externalUserId || !messageId || !content) return;
  const normalizedPhone = normalizeChatPhone(customerPhone);
  const conversation = await prisma.chatConversation.upsert({
    where: { channel_externalUserId: { channel, externalUserId } },
    create: { channel, externalUserId, customerName: customerName || null, customerPhone: customerPhone || null, normalizedPhone, profilePicUrl: profilePicUrl || null, lastMessageAt: new Date() },
    update: { ...(customerName && { customerName }), ...(customerPhone && { customerPhone, normalizedPhone }), ...(profilePicUrl && { profilePicUrl }), lastMessageAt: new Date(), status: "OPEN" },
    select: { id: true },
  });
  const replyToExternalMessageId = metadata?.replyToExternalMessageId;
  let savedMetadata = metadata;
  if (replyToExternalMessageId) {
    const quoted = await prisma.chatMessage.findFirst({
      where: { conversationId: conversation.id, channel, externalMessageId: replyToExternalMessageId },
      select: { id: true, content: true, direction: true, authorType: true },
    });
    if (quoted) {
      savedMetadata = { ...metadata, replyTo: { id: quoted.id, content: quoted.content.slice(0, 300), direction: quoted.direction, authorType: quoted.authorType } };
    } else savedMetadata = { ...metadata, replyTo: { content: "Replied to an earlier message" } };
  }
  const insertedCount = await prisma.$transaction(async (tx) => {
    const inserted = await tx.chatMessage.createMany({
      data: [{ conversationId: conversation.id, channel, direction: "INBOUND", authorType: "CUSTOMER", content: content.slice(0, 4000), externalMessageId: messageId, metadata: savedMetadata ? JSON.parse(JSON.stringify(savedMetadata)) : undefined }],
      skipDuplicates: true,
    });
    await tx.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), ...(inserted.count > 0 && { unreadCount: { increment: inserted.count } }) },
    });
    return inserted.count;
  });
  if (insertedCount > 0) after(() => sendChatPushNotification({ conversationId: conversation.id, channel, customerName, customerPhone, content }));
}

async function applyMetaMessageEdit(channel, edit) {
  const externalMessageId = edit?.message_id || edit?.id;
  const content = typeof edit?.text === "string" ? edit.text : edit?.text?.body;
  if (!externalMessageId || typeof content !== "string") return false;
  const message = await prisma.chatMessage.findFirst({
    where: { channel, externalMessageId },
    select: { id: true, metadata: true },
  });
  if (!message) return false;
  await prisma.chatMessage.update({
    where: { id: message.id },
    data: {
      content: content.slice(0, 4000),
      metadata: { ...(message.metadata || {}), edited: true, editedAt: new Date().toISOString() },
    },
  });
  return true;
}

async function applyMetaDeliveryStatus(channel, externalMessageId, status) {
  if (!externalMessageId) return;
  const mapped = ({ sent: "SENT", delivered: "DELIVERED", read: "READ", failed: "FAILED" })[status];
  if (!mapped) return;
  const message = await prisma.chatMessage.findFirst({
    where: { channel, externalMessageId, direction: "OUTBOUND" },
    select: { id: true, deliveryStatus: true },
  });
  if (!message) return;
  const rank = { SENDING: 0, SENT: 1, DELIVERED: 2, READ: 3, FAILED: 4 };
  if ((rank[mapped] ?? 0) >= (rank[message.deliveryStatus] ?? 0)) {
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: mapped } });
  }
}

export async function POST(request) {
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return new Response("Webhook payload is too large", { status: 413 });
  let credentials;
  try { credentials = await getCredentials(); } catch { return new Response("Webhook is not configured", { status: 503 }); }
  if (!hasValidSignature(rawBody, request.headers.get("x-hub-signature-256"), credentials.metaAppSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }
  try {
    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        if (credentials.whatsappEnabled) {
          for (const status of value.statuses || []) await applyMetaDeliveryStatus("WHATSAPP", status.id, status.status);
        }
        const contacts = new Map((value.contacts || []).map((contact) => [contact.wa_id, contact.profile?.name]));
        for (const message of credentials.whatsappEnabled ? value.messages || [] : []) {
          if (message.edit && await applyMetaMessageEdit("WHATSAPP", message.edit)) continue;
          const text = message.text?.body || message.image?.caption || message.document?.caption || `[${message.type || "unsupported"} message]`;
          await saveInboundMessage({
            channel: "WHATSAPP",
            externalUserId: message.from,
            customerName: contacts.get(message.from)?.trim().slice(0, 150),
            customerPhone: message.from,
            messageId: message.id,
            content: text,
            metadata: {
              type: message.type,
              timestamp: message.timestamp,
              phoneNumberId: value.metadata?.phone_number_id,
              ...(message.context?.id && { replyToExternalMessageId: message.context.id }),
              ...(message.image?.id && { image: { mediaId: message.image.id, mimeType: message.image.mime_type || "image/jpeg", caption: message.image.caption || null } }),
            },
          });
        }
      }
      const messengerProfiles = new Map();
      for (const event of credentials.messengerEnabled ? entry.messaging || [] : []) {
        if (event.delivery?.mids?.length) {
          for (const mid of event.delivery.mids) await applyMetaDeliveryStatus("MESSENGER", mid, "delivered");
        }
        if (event.read?.watermark && event.sender?.id) {
          const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalUserId: { channel: "MESSENGER", externalUserId: event.sender.id } }, select: { id: true } });
          if (conversation) await prisma.chatMessage.updateMany({ where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: "DELIVERED", createdAt: { lte: new Date(Number(event.read.watermark)) } }, data: { deliveryStatus: "READ" } });
        }
        if (event.message?.is_echo) continue;
        if (event.message?.edit && await applyMetaMessageEdit("MESSENGER", event.message.edit)) continue;
        const text = event.message?.text || (event.message?.attachments?.length ? `[${event.message.attachments[0].type || "attachment"} message]` : "");
        const senderId = event.sender?.id;
        if (senderId && !messengerProfiles.has(senderId) && event.message?.mid && text) {
          messengerProfiles.set(senderId, await getMessengerCustomerProfile(senderId, credentials));
        }
        const profile = messengerProfiles.get(senderId);
        await saveInboundMessage({
          channel: "MESSENGER",
          externalUserId: senderId,
          customerName: profile?.name || null,
          customerPhone: sharedChatPhone(event.message?.text),
          profilePicUrl: profile?.profilePicUrl || null,
          messageId: event.message?.mid,
          content: text,
          metadata: { timestamp: event.timestamp, attachments: event.message?.attachments || [], ...(event.message?.reply_to?.mid && { replyToExternalMessageId: event.message.reply_to.mid }) },
        });
      }
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Meta chat webhook processing failed:", error?.message || error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
