import { sendChatChannelTextMessage } from "@/backend/services/chatChannelTextAdapter";
import { normalizeChatPhone } from "@/lib/chatIdentity";
import prisma from "@/lib/prisma";
import { newerInboundWhere } from "./chatReplyBatchCore.mjs";

const normalizeDigits = (value) => String(value || "").replace(/[০-৯]/gu, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
const statusIntent = (value) => /(?:\b(?:order|parcel|shipment)\b.{0,40}\b(?:status|update|where|when|delivery|pabo|ashbe|kobe)\b|\b(?:amar|amr)\b.{0,25}\b(?:order|parcel)\b.{0,40}\b(?:kothay|status|kobe|pabo|ashbe)\b|\btrack(?:ing)?\b|আমার.{0,25}অর্ডার.{0,40}(?:স্ট্যাটাস|অবস্থা|কোথায়|কোথায়|কবে|পাব|আসবে|পৌঁছাবে)|অর্ডার.{0,40}(?:স্ট্যাটাস|অবস্থা|কোথায়|কোথায়|কবে|পাব|আসবে|পৌঁছাবে))/iu.test(String(value || ""));

const statusLabels = {
  PENDING: "অর্ডারটি গ্রহণ করা হয়েছে; নিশ্চিতকরণের অপেক্ষায় আছে।",
  PROCESSING: "অর্ডারটি প্রস্তুত করা হচ্ছে।",
  READY_TO_SHIP: "অর্ডারটি কুরিয়ারে পাঠানোর জন্য প্রস্তুত।",
  SHIPPED: "অর্ডারটি কুরিয়ারে পাঠানো হয়েছে।",
  DELIVERY_FAILED: "ডেলিভারির চেষ্টা সফল হয়নি।",
  FAILED_RETURNING: "ডেলিভারি হয়নি; পার্সেলটি ফেরত আসছে।",
  FAILED_RETURN_RECEIVED: "ডেলিভারি ব্যর্থ হয়েছে; পার্সেলটি ফেরত এসেছে।",
  DELIVERED: "অর্ডারটি ডেলিভারি সম্পন্ন হয়েছে।",
  CANCELLED: "অর্ডারটি বাতিল করা হয়েছে।",
  RETURNING: "অর্ডারটি ফেরত নেওয়ার প্রক্রিয়ায় আছে।",
  RETURNED: "অর্ডারটি ফেরত সম্পন্ন হয়েছে।",
  REFUNDING: "রিফান্ড প্রক্রিয়াধীন।",
  REFUNDED: "রিফান্ড সম্পন্ন হয়েছে।",
};

function extractOrderNo(text) {
  const value = normalizeDigits(text);
  const explicit = value.match(/(?:\border\s*(?:no\.?|number|#)?|অর্ডার\s*(?:নম্বর|নং\.?|#)?)\s*[:#-]?\s*(\d{5,20})\b/iu)?.[1];
  if (explicit) return explicit;
  if (/^\s*\d{5,9}\s*$/u.test(value)) return value.trim();
  const withoutPhone = value.replace(/(?:\+?88)?01[3-9](?:[\s().-]?\d){8}/u, " ");
  return withoutPhone.match(/\b\d{5,9}\b/u)?.[0] || null;
}

function extractPhone(text) {
  const value = normalizeDigits(text);
  const candidate = value.match(/(?:\+?88)?01[3-9](?:[\s().-]?\d){8}/u)?.[0];
  return candidate ? normalizeChatPhone(candidate) : null;
}

function lookupPrompt(orderNo, phone) {
  if (!orderNo && !phone) return "আপনার অর্ডারের সর্বশেষ অবস্থা জানাতে অর্ডার নম্বর এবং অর্ডারে ব্যবহৃত ফোন নম্বরটি পাঠান।";
  if (!orderNo) return "ধন্যবাদ। এখন অর্ডার নম্বরটি পাঠান।";
  if (!phone) return "ধন্যবাদ। এখন অর্ডারে ব্যবহৃত ফোন নম্বরটি পাঠান।";
  return null;
}

function orderStatusText(order) {
  const eta = order.shipping?.estimatedDelivery
    ? ` সম্ভাব্য ডেলিভারি: ${new Intl.DateTimeFormat("bn-BD", { dateStyle: "long" }).format(order.shipping.estimatedDelivery)}।`
    : " কুরিয়ারের সম্ভাব্য ডেলিভারির তারিখ এখনও পাওয়া যায়নি।";
  return `অর্ডার ${order.orderNo}-এর সর্বশেষ অবস্থা: ${statusLabels[order.status] || order.status}.${eta}`;
}

async function sendStatusReply({ conversation, inbound, credentials, text, statusLookup }) {
  const [newer, fresh] = await Promise.all([
    prisma.chatMessage.findFirst({ where: newerInboundWhere(inbound), select: { id: true } }),
    prisma.chatConversation.findUnique({ where: { id: conversation.id }, select: { aiModeEnabled: true, assignedToId: true, status: true, aiReplyLeaseToken: true } }),
  ]);
  if (newer || !fresh?.aiModeEnabled || fresh.assignedToId || fresh.status !== "OPEN" || (inbound.replyLeaseToken && fresh.aiReplyLeaseToken !== inbound.replyLeaseToken)) {
    await prisma.chatMessage.update({ where: { aiReplyForMessageId: inbound.id }, data: {
      deliveryStatus: "FAILED", metadata: { internalOnly: true, aiErrorCode: newer ? "batch_superseded" : "human_takeover" },
    } });
    return true;
  }
  const sent = await sendChatChannelTextMessage(conversation, text, credentials);
  await prisma.chatMessage.update({
    where: { aiReplyForMessageId: inbound.id },
    data: {
      content: text,
      deliveryStatus: "SENT",
      ...(sent.id && { externalMessageId: sent.id }),
      metadata: { type: "ORDER_STATUS", statusLookup, batchedMessageIds: inbound.metadata?.batchedMessageIds || [inbound.id] },
    },
  });
  await prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), consecutiveAiFailures: 0 } });
  return true;
}

export async function handleChatOrderStatusFlow({ conversation, inbound, credentials }) {
  const explicitIntent = statusIntent(inbound.content);
  const contextualEtaIntent = /(?:\bkobe\s+(?:pabo|ashbe|asbe)\b|\bwhen\s+(?:will|can)\s+(?:it|i)\s+(?:arrive|get it)\b|কবে\s*(?:পাব|আসবে|পৌঁছাবে))/iu.test(String(inbound.content || ""));
  const incomingOrderNo = extractOrderNo(inbound.content);
  const incomingPhone = extractPhone(inbound.content);
  if (!explicitIntent && !contextualEtaIntent && !incomingOrderNo && !incomingPhone) return false;

  const recent = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: { not: "FAILED" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: { metadata: true },
  });
  const previous = recent.find((message) => message.metadata?.statusLookup)?.metadata.statusLookup || null;
  const recentChatOrder = recent.find((message) => message.metadata?.type === "ORDER_PLACED" && message.metadata?.orderNo)?.metadata || null;
  const intent = explicitIntent || (contextualEtaIntent && (previous?.step === "verified" || Boolean(recentChatOrder)));
  if (!intent && previous?.step !== "awaiting_credentials") return false;
  if (!intent && !incomingOrderNo && !incomingPhone) return false;

  if (intent && previous?.step !== "awaiting_credentials" && previous?.step !== "verified" && !incomingOrderNo && !incomingPhone) {
    if (recentChatOrder?.orderNo) {
      const order = await prisma.order.findUnique({ where: { orderNo: recentChatOrder.orderNo }, select: { orderNo: true, status: true, shipping: { select: { estimatedDelivery: true } } } });
      if (order) return sendStatusReply({ conversation, inbound, credentials, text: orderStatusText(order), statusLookup: { step: "verified", orderNo: order.orderNo } });
    }
  }

  if (previous?.step === "verified" && intent) {
    const requestedDifferentOrder = incomingOrderNo && incomingOrderNo !== previous.orderNo;
    if (!requestedDifferentOrder && !incomingPhone) {
      const order = await prisma.order.findUnique({ where: { orderNo: previous.orderNo }, select: { orderNo: true, status: true, shipping: { select: { estimatedDelivery: true } } } });
      if (order) {
        return sendStatusReply({ conversation, inbound, credentials, text: orderStatusText(order), statusLookup: previous });
      }
    }
  }

  const isContinuing = previous?.step === "awaiting_credentials";
  const orderNo = incomingOrderNo || (isContinuing ? previous.orderNo : null);
  const phone = incomingPhone || (isContinuing ? previous.phone : null);
  if (!orderNo || !phone) {
    const text = lookupPrompt(orderNo, phone) || "অর্ডার নম্বর ও অর্ডারে ব্যবহৃত ফোন নম্বর দুটোই পাঠান।";
    return sendStatusReply({ conversation, inbound, credentials, text, statusLookup: { step: "awaiting_credentials", orderNo, phone } });
  }

  const order = await prisma.order.findUnique({
    where: { orderNo },
    select: { orderNo: true, phoneNumber: true, status: true, shipping: { select: { estimatedDelivery: true } } },
  });
  if (!order || normalizeChatPhone(order.phoneNumber) !== normalizeChatPhone(phone)) {
    return sendStatusReply({ conversation, inbound, credentials, text: "অর্ডার নম্বর ও ফোন নম্বর মিলছে না। সঠিক অর্ডার নম্বর এবং অর্ডারে ব্যবহৃত ফোন নম্বর আবার পাঠান।", statusLookup: { step: "awaiting_credentials", orderNo: null, phone: null } });
  }

  return sendStatusReply({
    conversation,
    inbound,
    credentials,
    text: orderStatusText(order),
    statusLookup: { step: "verified", orderNo: order.orderNo },
  });
}
