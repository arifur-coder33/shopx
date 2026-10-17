import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
    select: { id: true, status: true, messages: { orderBy: { createdAt: "asc" }, take: 100, select: { id: true, direction: true, content: true, deliveryStatus: true, createdAt: true } } },
  });
  if (conversation) await prisma.chatMessage.updateMany({
    where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: "SENT" },
    data: { deliveryStatus: "DELIVERED" },
  });
  if (conversation) {
    conversation.messages = conversation.messages.map((message) => message.direction === "OUTBOUND" && message.deliveryStatus === "SENT" ? { ...message, deliveryStatus: "DELIVERED" } : message);
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
  const customerName = String(body?.name || "").trim().slice(0, 100) || null;
  const customerPhone = String(body?.phone || "").trim().slice(0, 30) || null;
  try {
    const conversation = await prisma.chatConversation.upsert({
      where: { channel_externalUserId: { channel: "WEBSITE", externalUserId } },
      create: { channel: "WEBSITE", externalUserId, customerName, customerPhone, lastMessageAt: new Date() },
      update: { ...(customerName && { customerName }), ...(customerPhone && { customerPhone }), lastMessageAt: new Date(), status: "OPEN" },
      select: { id: true },
    });
    const [message] = await prisma.$transaction([
      prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content, deliveryStatus: "DELIVERED" } }),
      prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: "OPEN", unreadCount: { increment: 1 } } }),
    ]);
    return Response.json({ success: true, data: { id: message.id, direction: message.direction, content: message.content, deliveryStatus: message.deliveryStatus, createdAt: message.createdAt } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ success: false, message: "Message could not be saved. Please try again." }, { status: 500 });
  }
}
