import { createHash } from "node:crypto";
import { auth } from "@/auth";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { sendChatPushNotification } from "@/backend/services/chatPushService";

export const dynamic = "force-dynamic";

const sameOrigin = (request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === (request.headers.get("x-forwarded-host") || request.headers.get("host")); }
  catch { return false; }
};

const publicOrderSelect = {
  id: true, orderNo: true, customerName: true, orderPrice: true, status: true, createdAt: true,
  orderItems: { select: { productName: true, quantity: true, price: true, thumbnail: true } },
  timeline: { orderBy: { createdAt: "asc" }, take: 30, select: { status: true, title: true, message: true, location: true, createdAt: true } },
};

const toPublicOrder = (order) => ({
  ...order,
  createdAt: order.createdAt.toISOString(),
  timeline: order.timeline.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
});

export async function POST(request) {
  if (!sameOrigin(request)) return Response.json({ success: false, message: "Invalid origin." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const session = await auth();
  try {
    if (session?.user?.id) {
      if (body?.action === "share") {
        const token = String(body?.token || "");
        const orderId = String(body?.orderId || "");
        if (!/^[a-f0-9-]{36}$/i.test(token) || !orderId) return Response.json({ success: false, message: "Order share request invalid." }, { status: 400 });
        const externalUserId = createHash("sha256").update(token).digest("hex");
        const [order, user, setting] = await Promise.all([
          prisma.order.findFirst({ where: { id: orderId, userId: session.user.id }, select: publicOrderSelect }),
          prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, phone: true } }),
          prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true } }),
        ]);
        if (setting?.websiteChatEnabled === false) return Response.json({ success: false, message: "Website chat is currently unavailable." }, { status: 403 });
        if (!order) return Response.json({ success: false, message: "এই order আপনার account-এর নয়।" }, { status: 404 });
        const conversation = await prisma.chatConversation.upsert({
          where: { channel_externalUserId: { channel: "WEBSITE", externalUserId } },
          create: { channel: "WEBSITE", externalUserId, customerName: user?.name || null, customerPhone: user?.phone || null, lastMessageAt: new Date() },
          update: { ...(user?.name && { customerName: user.name }), ...(user?.phone && { customerPhone: user.phone }), lastMessageAt: new Date(), status: "OPEN" },
          select: { id: true },
        });
        const card = { id: order.id, orderNo: order.orderNo, status: order.status, orderPrice: order.orderPrice, createdAt: order.createdAt.toISOString(), orderItems: order.orderItems, events: order.timeline.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
        const [message] = await prisma.$transaction([
          prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content: `Customer shared order ${order.orderNo}`, deliveryStatus: "DELIVERED", metadata: { type: "ORDER_TIMELINE", order: card } } }),
          prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: "OPEN", unreadCount: { increment: 1 } } }),
        ]);
        after(() => sendChatPushNotification({ conversationId: conversation.id, channel: "WEBSITE", customerName: user?.name, customerPhone: user?.phone, content: message.content, metadata: message.metadata }));
        return Response.json({ success: true, messageId: message.id }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
      }
      const orders = await prisma.order.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20, select: publicOrderSelect });
      return Response.json({ success: true, authenticated: true, orders: orders.map(toPublicOrder) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const orderNo = String(body?.orderNo || "").trim().slice(0, 40);
    const phone = String(body?.phone || "").replace(/\D/g, "").slice(0, 20);
    if (!orderNo || phone.length < 7) return Response.json({ success: false, message: "Order number ও phone number দিন।" }, { status: 400 });
    const order = await prisma.order.findUnique({ where: { orderNo }, select: { ...publicOrderSelect, phoneNumber: true } });
    const savedPhone = String(order?.phoneNumber || "").replace(/\D/g, "");
    if (!order || savedPhone.length < 7 || savedPhone.slice(-10) !== phone.slice(-10)) {
      return Response.json({ success: false, message: "Order number বা phone number মেলেনি।" }, { status: 404 });
    }
    const { phoneNumber, ...safeOrder } = order;
    return Response.json({ success: true, authenticated: false, orders: [toPublicOrder(safeOrder)] }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ success: false, message: "Order খুঁজে পাওয়া যায়নি। আবার চেষ্টা করুন।" }, { status: 500 });
  }
}
