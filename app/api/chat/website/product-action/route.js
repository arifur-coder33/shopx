import { createHash } from "node:crypto";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { isChatOrderCreationEnabled } from "@/backend/services/chatOrderSettings";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { maybeSendChatAiReply } from "@/backend/services/chatAiReplyService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const validPhone = (value) => /^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(String(value || "").replace(/\D/g, ""));
const clean = (value, limit = 150) => String(value || "").trim().slice(0, limit);

export async function POST(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && (!host || new URL(origin).host !== host)) return Response.json({ success: false, message: "Invalid origin." }, { status: 403 });
  let body;
  try {
    const raw = await request.text();
    if (raw.length > 4096) throw new Error("Request too large");
    body = JSON.parse(raw);
  } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const token = clean(body.token, 40);
  const productId = clean(body.productId, 80);
  const action = clean(body.action, 30);
  if (!/^[a-f0-9-]{36}$/i.test(token) || (!productId && !["lead", "checkout"].includes(action))) return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalUserId: { channel: "WEBSITE", externalUserId: createHash("sha256").update(token).digest("hex") } }, select: { id: true, aiModeEnabled: true } });
  if (!conversation) return Response.json({ success: false, message: "Chat পাওয়া যায়নি।" }, { status: 404 });
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true, aiAutoReplyEnabled: true, encryptedCredentials: true, quickReplies: true } });
  if (setting?.websiteChatEnabled === false) return Response.json({ success: false, message: "Chat এখন বন্ধ আছে।" }, { status: 403 });
  const canCreateOrder = isChatOrderCreationEnabled(setting);
  if (["order", "inbox", "checkout"].includes(action)) {
    if (!conversation.aiModeEnabled || !setting?.aiAutoReplyEnabled) return Response.json({ success: false, message: "আমাদের প্রতিনিধি এই চ্যাটে আপনার অর্ডারটি নিতে সাহায্য করবেন।" }, { status: 409 });
    const payload = action === "checkout" ? clean(body.payload, 240) : `order:${productId}`;
    if (action === "checkout" && !/^checkout:[a-f0-9-]{36}:[a-f0-9-]{36}:[a-zA-Z0-9_-]+$/u.test(payload)) return Response.json({ success: false, message: "Invalid checkout action." }, { status: 400 });
    const inbound = await prisma.chatMessage.create({ data: {
      conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", deliveryStatus: "DELIVERED",
      content: action === "checkout" ? clean(body.title || "অর্ডারের তথ্য বেছে নিলাম", 120) : "অর্ডার করতে চাই",
      metadata: { ...(productId && { productId }), action, quickReplyPayload: payload },
    } });
    await prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } } });
    after(() => maybeSendChatAiReply(conversation.id, inbound.id));
    return Response.json({ success: true, data: { inboundId: inbound.id, metadata: { type: "CHAT_ORDER_PENDING" } } });
  }
  const product = productId ? await prisma.product.findFirst({
    where: { id: productId, isActive: true, status: "ACTIVE" },
    select: { id: true, title: true, slug: true, description: true, seoDescription: true, allowOutOfStockOrder: true, codAvailable: true, advancePaymentType: true,
      specifications: { take: 8, orderBy: { sortOrder: "asc" }, select: { value: true, specification: { select: { name: true } } } },
      variations: { take: 30, select: { id: true, regularPrice: true, discountPrice: true, stocks: { select: { available: true } }, combinations: { select: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } } } },
    },
  }) : null;
  if (!product && action !== "lead") return Response.json({ success: false, message: "এই পণ্যটি এখন পাওয়া যাচ্ছে না।" }, { status: 404 });
  const variants = (product?.variations || []).map((variant) => ({
    id: variant.id,
    label: variant.combinations.map((part) => `${part.variationName?.name}: ${part.variationValue?.value}`).join(" / ") || "সাধারণ",
    price: Number(variant.discountPrice) > 0 && Number(variant.discountPrice) < Number(variant.regularPrice) ? Number(variant.discountPrice) : Number(variant.regularPrice),
    inStock: product.allowOutOfStockOrder || variant.stocks.some((stock) => stock.available > 0),
  }));
  const buyNowUrl = product ? `/buynow/${encodeURIComponent(product.slug)}` : null;
  if (["details", "select"].includes(action) && setting?.aiAutoReplyEnabled && setting.encryptedCredentials && conversation.aiModeEnabled) {
    const inbound = await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        channel: "WEBSITE",
        direction: "INBOUND",
        authorType: "CUSTOMER",
        content: action === "select" ? `এই পণ্যটি নির্বাচন করলাম: ${product.title}। এটি সম্পর্কে বিস্তারিত জানান।` : "এটা সম্পর্কে আরও জানতে চাই",
        deliveryStatus: "DELIVERED",
        metadata: { productId: product.id, quickReplyPayload: `${action}:${product.id}`, action },
      },
    });
    await prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: "OPEN", unreadCount: { increment: 1 } } });
    after(() => maybeSendChatAiReply(conversation.id, inbound.id));
    return Response.json({ success: true, data: { inboundId: inbound.id, metadata: { type: "AI_DETAILS_PENDING", productId: product.id } } }, { headers: { "Cache-Control": "no-store" } });
  }
  let reply;
  let metadata = { productId: product?.id || null };
  if (action === "select") {
    reply = `জি, ${product.title} পণ্যটি নির্বাচন করা হয়েছে। এটি সম্পর্কে কী জানতে চান?`;
    metadata = { ...metadata, type: "PRODUCT_SELECTED", selectedProductId: product.id };
  } else if (action === "details") {
    const description = clean((product.description || product.seoDescription || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " "), 850);
    const features = product.specifications.map((spec) => `${spec.specification?.name}: ${spec.value}`).filter(Boolean);
    reply = [description || "এই পণ্যের বিস্তারিত বিবরণ এখন দেওয়া নেই।", ...features.map((feature) => `• ${feature}`)].join("\n");
  } else if (action === "order") {
    reply = canCreateOrder ? "আপনি কি ওয়েবসাইটে গিয়ে অর্ডার করবেন, নাকি এখানেই ইনবক্সে অর্ডার করবেন?" : "আপনার নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
    metadata = { ...metadata, type: canCreateOrder ? "ORDER_CHOICE" : "CONTACT_FORM", buyNowUrl };
  } else if (action === "website") {
    reply = "ওয়েবসাইটে অর্ডার করতে নিচের লিংকে যান।\n১. ‘এখনই কিনুন’ চাপুন।\n২. নাম, ফোন, ঠিকানা, জেলা ও থানা লিখুন।\n৩. ঢাকার ভিতরে/বাইরে এবং পেমেন্ট পদ্ধতি বেছে নিন।\n৪. ‘Place Order’ চাপুন।";
    metadata = { ...metadata, type: "ORDER_WEBSITE", buyNowUrl };
  } else if (action === "inbox") {
    if (!canCreateOrder) {
      reply = "আপনার নাম, ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
      metadata = { ...metadata, type: "CONTACT_FORM" };
    } else if (product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)) {
      reply = "এই পণ্যে অনলাইন/অগ্রিম পেমেন্ট লাগে। নিচের লিংকে নিরাপদে অর্ডার করুন।";
      metadata = { ...metadata, type: "ORDER_WEBSITE", buyNowUrl };
    } else {
      reply = variants.length > 1 ? "কোন ভ্যারিয়েন্টটি নিতে চান? নিচে বেছে নিন।" : "অর্ডারের তথ্য নিচের ফর্মে দিন।";
      metadata = { ...metadata, type: "ORDER_INBOX", variants, buyNowUrl };
    }
  } else if (action === "place") {
    return Response.json({ success: false, message: "আগে পণ্য নিশ্চিত করে অর্ডারের সারাংশ দেখুন। সর্বশেষ সারাংশের Place order বাটন ব্যবহার করুন।" }, { status: 409 });
  } else if (action === "lead") {
    const customerName = clean(body.customerName, 100);
    const phoneNumber = clean(body.phoneNumber, 20).replace(/\D/g, "");
    const deliveryAddress = clean(body.deliveryAddress, 250);
    if (!customerName || !validPhone(phoneNumber) || deliveryAddress.length < 8) return Response.json({ success: false, message: "নাম, সঠিক ফোন নম্বর ও সম্পূর্ণ ঠিকানা দিন।" }, { status: 400 });
    reply = "তথ্য পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
    metadata = { ...metadata, type: "CONTACT_RECEIVED" };
    body.contactDetails = { customerName, phoneNumber, deliveryAddress };
  } else return Response.json({ success: false, message: "Unknown action." }, { status: 400 });
  const [inbound, outbound] = await prisma.$transaction([
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content: action === "lead" ? `যোগাযোগের তথ্য:\nনাম: ${body.contactDetails.customerName}\nফোন: ${body.contactDetails.phoneNumber}\nঠিকানা: ${body.contactDetails.deliveryAddress}` : action === "select" ? `এই পণ্যটি নির্বাচন করলাম: ${product.title}` : action === "place" ? "অর্ডার নিশ্চিত করুন" : action === "details" ? "এটা সম্পর্কে আরও জানতে চাই" : action === "order" ? "অর্ডার করতে চাই" : action === "website" ? "ওয়েবসাইটে অর্ডার করব" : "এখানে অর্ডার করব", deliveryStatus: "DELIVERED", metadata: { productId: product?.id || null, action, ...(action === "select" && { quickReplyPayload: `select:${product.id}` }) } } }),
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "OUTBOUND", authorType: "AI", content: reply, deliveryStatus: "SENT", metadata } }),
    prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: action === "lead" ? "PENDING" : "OPEN", ...(action === "lead" && { customerName: body.contactDetails.customerName, customerPhone: body.contactDetails.phoneNumber, normalizedPhone: body.contactDetails.phoneNumber.startsWith("88") ? `0${body.contactDetails.phoneNumber.slice(2)}` : body.contactDetails.phoneNumber, aiModeEnabled: false }), unreadCount: { increment: 1 } } }),
  ]);
  if (action === "lead") after(() => sendChatPushNotification({ conversationId: conversation.id, channel: "WEBSITE", customerName: body.contactDetails.customerName, customerPhone: body.contactDetails.phoneNumber, content: inbound.content }).catch(() => {}));
  return Response.json({ success: true, data: { inboundId: inbound.id, outboundId: outbound.id, metadata } }, { headers: { "Cache-Control": "no-store" } });
}
