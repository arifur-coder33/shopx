import { createHmac, timingSafeEqual } from "node:crypto";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { sendChatPushNotification } from "@/backend/services/chatPushService";

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

async function saveInboundMessage({ channel, externalUserId, customerName, customerPhone, messageId, content, metadata }) {
  if (!externalUserId || !messageId || !content) return;
  const conversation = await prisma.chatConversation.upsert({
    where: { channel_externalUserId: { channel, externalUserId } },
    create: { channel, externalUserId, customerName: customerName || null, customerPhone: customerPhone || null, lastMessageAt: new Date() },
    update: { ...(customerName && { customerName }), ...(customerPhone && { customerPhone }), lastMessageAt: new Date(), status: "OPEN" },
    select: { id: true },
  });
  const insertedCount = await prisma.$transaction(async (tx) => {
    const inserted = await tx.chatMessage.createMany({
      data: [{ conversationId: conversation.id, channel, direction: "INBOUND", authorType: "CUSTOMER", content: content.slice(0, 4000), externalMessageId: messageId, metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined }],
      skipDuplicates: true,
    });
    await tx.chatConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), ...(inserted.count > 0 && { unreadCount: { increment: inserted.count } }) },
    });
    return inserted.count;
  });
  if (insertedCount > 0) await sendChatPushNotification({ conversationId: conversation.id, channel, customerName, customerPhone, content });
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
          const text = message.text?.body || message.image?.caption || message.document?.caption || `[${message.type || "unsupported"} message]`;
          await saveInboundMessage({
            channel: "WHATSAPP",
            externalUserId: message.from,
            customerName: contacts.get(message.from),
            customerPhone: message.from,
            messageId: message.id,
            content: text,
            metadata: { type: message.type, timestamp: message.timestamp, phoneNumberId: value.metadata?.phone_number_id },
          });
        }
      }
      for (const event of credentials.messengerEnabled ? entry.messaging || [] : []) {
        if (event.delivery?.mids?.length) {
          for (const mid of event.delivery.mids) await applyMetaDeliveryStatus("MESSENGER", mid, "delivered");
        }
        if (event.read?.watermark && event.sender?.id) {
          const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalUserId: { channel: "MESSENGER", externalUserId: event.sender.id } }, select: { id: true } });
          if (conversation) await prisma.chatMessage.updateMany({ where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: "DELIVERED", createdAt: { lte: new Date(Number(event.read.watermark)) } }, data: { deliveryStatus: "READ" } });
        }
        if (event.message?.is_echo) continue;
        const text = event.message?.text || (event.message?.attachments?.length ? `[${event.message.attachments[0].type || "attachment"} message]` : "");
        await saveInboundMessage({
          channel: "MESSENGER",
          externalUserId: event.sender?.id,
          customerName: null,
          messageId: event.message?.mid,
          content: text,
          metadata: { timestamp: event.timestamp, attachments: event.message?.attachments || [] },
        });
      }
    }
    return Response.json({ success: true });
  } catch (error) {
    console.error("Meta chat webhook processing failed:", error?.message || error);
    return new Response("Webhook processing failed", { status: 500 });
  }
}
