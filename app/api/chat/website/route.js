import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { maybeSendChatAiReply } from "@/backend/services/chatAiReplyService";
import { getWebsitePageProductContext } from "@/backend/utils/chatWebsitePageContext.mjs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const rateBuckets = globalThis.__websiteChatRateBuckets || (globalThis.__websiteChatRateBuckets = new Map());
const isSameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export async function GET(request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!/^[a-f0-9-]{36}$/i.test(token)) return Response.json({ success: false }, { status: 400 });
  const conversation = await prisma.chatConversation.findUnique({
    where: { channel_externalUserId: { channel: "WEBSITE", externalUserId: hashToken(token) } },
    select: { id: true, status: true, messages: { where: { OR: [{ direction: "INBOUND" }, { deliveryStatus: { not: "FAILED" } }] }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, direction: true, content: true, deliveryStatus: true, metadata: true, createdAt: true } } },
  });
  if (conversation) await prisma.chatMessage.updateMany({
    where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: "SENT" },
    data: { deliveryStatus: "DELIVERED" },
  });
  if (conversation) {
    conversation.messages = conversation.messages.filter((message) => !message.metadata?.internalOnly).map((message) => message.direction === "OUTBOUND" && message.deliveryStatus === "SENT" ? { ...message, deliveryStatus: "DELIVERED" } : message);
  }
  return Response.json({ success: true, data: conversation }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  if (!isSameOrigin(request)) return Response.json({ success: false, message: "Invalid origin." }, { status: 403 });
  const forwardedFor = request.headers.get("x-forwarded-for") || "unknown";
  const clientAddress = forwardedFor.split(",").at(-1).trim();
  const now = Date.now();
  const bucket = rateBuckets.get(clientAddress);
  if (bucket && now - bucket.startedAt < 60_000 && bucket.count >= 12) {
    return Response.json({ success: false, message: "অনেক দ্রুত message পাঠানো হচ্ছে। এক মিনিট পর আবার চেষ্টা করুন।" }, { status: 429 });
  }
  if (!bucket || now - bucket.startedAt >= 60_000) rateBuckets.set(clientAddress, { startedAt: now, count: 1 });
  else bucket.count += 1;
  if (rateBuckets.size > 5000) {
    for (const [key, value] of rateBuckets) if (now - value.startedAt >= 60_000) rateBuckets.delete(key);
  }
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true } });
  if (setting?.websiteChatEnabled === false) return Response.json({ success: false, message: "Website chat is currently unavailable." }, { status: 403 });
  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 8192) return Response.json({ success: false, message: "Request is too large." }, { status: 413 });
    body = JSON.parse(rawBody);
  } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const token = String(body?.token || "");
  const content = String(body?.content || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(token) || !content || content.length > 2000) {
    return Response.json({ success: false, message: "Message is invalid or too long." }, { status: 400 });
  }
  const externalUserId = hashToken(token);
  const session = await auth();
  const account = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, phone: true } }) : null;
  const customerName = account?.name || String(body?.name || "").trim().slice(0, 100) || null;
  const customerPhone = account?.phone || String(body?.phone || "").trim().slice(0, 30) || null;
  const websitePage = await getWebsitePageProductContext(
    body?.pagePath || request.headers.get("referer"),
  ).catch(() => null);
  try {
    const conversation = await prisma.chatConversation.upsert({
      where: { channel_externalUserId: { channel: "WEBSITE", externalUserId } },
      create: { channel: "WEBSITE", externalUserId, customerName, customerPhone, customerUserId: account?.id || null, lastMessageAt: new Date() },
      update: { ...(customerName && { customerName }), ...(customerPhone && { customerPhone }), ...(account?.id && { customerUserId: account.id }), lastMessageAt: new Date() },
      select: { id: true, needsHumanAssistant: true },
    });
    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content, deliveryStatus: "DELIVERED", ...(websitePage && { metadata: { websitePage } }) } }),
      prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: "OPEN", unreadCount: { increment: 1 } } }),
    ]);
    after(async () => {
      await Promise.allSettled([
        sendChatPushNotification({ conversationId: conversation.id, channel: "WEBSITE", customerName, customerPhone, content: message.content }),
        maybeSendChatAiReply(conversation.id, message.id),
      ]);
    });
    return Response.json({ success: true, data: { id: message.id, direction: message.direction, content: message.content, deliveryStatus: message.deliveryStatus, createdAt: message.createdAt } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ success: false, message: "Message could not be saved. Please try again." }, { status: 500 });
  }
}
