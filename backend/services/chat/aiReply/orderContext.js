/**
 * Chat AI reply: Looks up verified customer orders before answering status questions.
 * Keep this module focused on one step of the reply pipeline.
 */
import prisma from "@/lib/prisma";
import { normalizeChatPhone, sharedChatPhone } from "@/lib/chatIdentity";
import { normalizeDigits } from "./productMemory.js";
import { shouldFetchOrderContext } from "@/backend/utils/chatAiPreferences.mjs";

export function orderNumberFrom(text) {
  const normalized = normalizeDigits(text);
  const explicitOrderNo = normalized.match(
    /(?:\border\s*(?:no\.?|number|#)?|অর্ডার\s*(?:নম্বর|নং|নং\.?|#)?)\s*[:#-]?\s*(\d{5,20})\b/iu,
  )?.[1];
  if (explicitOrderNo) return explicitOrderNo;
  return normalized.match(/\b\d{5,9}\b/u)?.[0] || null;
}

export async function getVerifiedOrders(conversation, messageText, history = []) {
  const currentOrderNo = orderNumberFrom(messageText);
  const currentPhone = sharedChatPhone(normalizeDigits(messageText));
  const recentOrderIntent = [...history]
    .reverse()
    .find(
      (message) =>
        message.direction === "INBOUND" &&
        shouldFetchOrderContext(message.content),
    );
  const requestedOrderNo =
    currentOrderNo ||
    (currentPhone ? orderNumberFrom(recentOrderIntent?.content) : null);
  const standaloneOrderNumber = /^\s*\d{5,9}\s*$/u.test(
    normalizeDigits(messageText),
  );
  const orderStatusContext =
    /(?:\bstatus\b|\btracking\b|স্ট্যাটাস|অবস্থা|ট্র্যাক)/iu.test(
      String(messageText || ""),
    );
  const orderLookupRequested =
    shouldFetchOrderContext(messageText) ||
    Boolean(currentOrderNo && orderStatusContext) ||
    standaloneOrderNumber ||
    Boolean(currentPhone && recentOrderIntent);
  if (!orderLookupRequested) return [];
  let where = null;
  if (conversation.customerUserId) {
    where = {
      userId: conversation.customerUserId,
      ...(requestedOrderNo && { orderNo: requestedOrderNo }),
    };
  } else {
    // Order numbers alone are not sufficient proof of ownership. Use the
    // WhatsApp sender number or a phone number already verified on the chat.
    const verifiedPhone = normalizeChatPhone(
      conversation.channel === "WHATSAPP"
        ? conversation.externalUserId
        : conversation.normalizedPhone ||
            conversation.customerPhone ||
            currentPhone,
    );
    if (verifiedPhone) {
      const suffix = verifiedPhone.slice(-10);
      where = {
        AND: [
          {
            OR: [
              { phoneNumber: { contains: suffix } },
              { phoneNumber: { contains: verifiedPhone } },
            ],
          },
          ...(requestedOrderNo ? [{ orderNo: requestedOrderNo }] : []),
        ],
      };
    }
  }
  if (!where) return [];
  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: requestedOrderNo ? 1 : 2,
    select: {
      orderNo: true,
      status: true,
      paymentStatus: true,
      orderPrice: true,
      deliveryCharge: true,
      deliveryDiscount: true,
      createdAt: true,
      orderItems: {
        take: 8,
        select: { productName: true, quantity: true, price: true },
      },
      timeline: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { status: true, title: true, createdAt: true },
      },
      refunds: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { amount: true, status: true, refundedAt: true },
      },
    },
  });
  return orders.map((order) => ({
    orderNo: order.orderNo,
    status: order.status,
    paymentStatus: order.paymentStatus,
    productTotal: Number(order.orderPrice),
    deliveryCharge: Number(order.deliveryCharge),
    deliveryDiscount: Number(order.deliveryDiscount),
    createdAt: order.createdAt.toISOString(),
    items: order.orderItems.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.price),
    })),
    recentTimeline: order.timeline.map((event) => ({
      status: event.status,
      title: event.title,
      at: event.createdAt.toISOString(),
    })),
    refunds: order.refunds.map((refund) => ({
      amount: Number(refund.amount),
      status: refund.status,
      refundedAt: refund.refundedAt?.toISOString() || null,
    })),
  }));
}
