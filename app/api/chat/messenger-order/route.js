import { after } from "next/server";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { createOrder } from "@/backend/serverActions/orderActions";
import { readMessengerOrderToken } from "@/backend/services/chatMessengerOrderLink";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { sendChatChannelTextMessage } from "@/backend/services/chatChannelTextAdapter";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { isChatOrderCreationEnabled } from "@/backend/services/chatOrderSettings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const clean = (value, max = 150) => String(value || "").trim().slice(0, max);
const validPhone = (value) => /^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(String(value || "").replace(/\D/g, ""));

async function context(token) {
  const claim = readMessengerOrderToken(token);
  if (!claim) return null;
  const [conversation, product, setting] = await Promise.all([
    prisma.chatConversation.findFirst({ where: { id: claim.conversationId, channel: "MESSENGER" }, select: { id: true, channel: true, externalUserId: true } }),
    prisma.product.findFirst({ where: { id: claim.productId, isActive: true, status: "ACTIVE" }, select: { id: true, title: true, slug: true, allowOutOfStockOrder: true, codAvailable: true, advancePaymentType: true, variations: { take: 30, select: { id: true, regularPrice: true, discountPrice: true, stocks: { select: { available: true } }, combinations: { select: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } } } } } }),
    prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { messengerEnabled: true, quickReplies: true, encryptedCredentials: true } }),
  ]);
  if (!conversation || !product || setting?.messengerEnabled === false) return null;
  return { conversation, product, setting, canCreateOrder: isChatOrderCreationEnabled(setting) };
}

export async function GET(request) {
  const data = await context(new URL(request.url).searchParams.get("t"));
  if (!data) return Response.json({ success: false, message: "লিংকটির মেয়াদ শেষ বা পণ্যটি পাওয়া যাচ্ছে না।" }, { status: 404 });
  const { product, canCreateOrder } = data;
  return Response.json({ success: true, data: { title: product.title, canCreateOrder, canOrderInChat: product.codAvailable !== false && !["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType), websiteUrl: `/buynow/${encodeURIComponent(product.slug)}`, variants: product.variations.map((variant) => { const hasStock = variant.stocks.some((stock) => stock.available > 0); const canOrder = hasStock || product.allowOutOfStockOrder; return { id: variant.id, label: variant.combinations.map((part) => `${part.variationName?.name}: ${part.variationValue?.value}`).join(" / ") || "সাধারণ", price: Number(variant.discountPrice) > 0 && Number(variant.discountPrice) < Number(variant.regularPrice) ? Number(variant.discountPrice) : Number(variant.regularPrice), inStock: canOrder, hasStock, canOrder }; }) } }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  try { if (origin && (!host || new URL(origin).host !== host)) return Response.json({ success: false, message: "Invalid origin." }, { status: 403 }); }
  catch { return Response.json({ success: false, message: "Invalid origin." }, { status: 403 }); }
  let body;
  try { const raw = await request.text(); if (raw.length > 4096) throw new Error(); body = JSON.parse(raw); }
  catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const data = await context(body?.token);
  if (!data) return Response.json({ success: false, message: "লিংকটির মেয়াদ শেষ বা পণ্যটি পাওয়া যাচ্ছে না।" }, { status: 404 });
  const { conversation, product, setting, canCreateOrder } = data;
  const customerName = clean(body.customerName, 100);
  const phoneNumber = clean(body.phoneNumber, 20).replace(/\D/g, "");
  const deliveryAddress = clean(body.deliveryAddress, 250);
  if (!customerName || !validPhone(phoneNumber) || deliveryAddress.length < 8) return Response.json({ success: false, message: "নাম, সঠিক মোবাইল নম্বর ও সম্পূর্ণ ঠিকানা দিন।" }, { status: 400 });
  let orderNo = null;
  let trackingUrl = null;
  let invoiceUrl = null;
  if (canCreateOrder) {
    const district = clean(body.district, 100);
    const thana = clean(body.thana, 100);
    const deliveryArea = clean(body.deliveryArea, 20);
    const variant = product.variations.find((item) => item.id === clean(body.variantId, 80));
    if (!district || !thana || !["inside-dhaka", "outside-dhaka"].includes(deliveryArea) || !variant || (!product.allowOutOfStockOrder && !variant.stocks.some((stock) => stock.available > 0))) return Response.json({ success: false, message: "ভ্যারিয়েন্ট, জেলা, থানা ও ডেলিভারি এলাকা সঠিকভাবে দিন।" }, { status: 400 });
    if (product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)) return Response.json({ success: false, message: "এই পণ্যের জন্য ওয়েবসাইটে অনলাইন পেমেন্ট করে অর্ডার করুন।" }, { status: 400 });
    const form = new FormData();
    for (const [key, value] of Object.entries({ customerName, phoneNumber, deliveryAddress, district, thana, deliveryArea, paymentMethod: "COD" })) form.set(key, value);
    form.set("products", JSON.stringify([{ title: product.title, productId: product.id, variation: { id: variant.id, combinations: [] }, quantity: 1 }]));
    const order = await createOrder(form);
    if (!order?.success || !order.data?.orderNo) return Response.json({ success: false, message: order?.error || "অর্ডার করা যায়নি।" }, { status: 400 });
    orderNo = order.data.orderNo;
    const siteUrl = await getSiteUrl();
    trackingUrl = new URL(`/tracking/?o=${encodeURIComponent(orderNo)}&p=${encodeURIComponent(phoneNumber)}`, siteUrl).toString();
    invoiceUrl = new URL(`/api/pdf/invoice?o=${encodeURIComponent(orderNo)}&p=${encodeURIComponent(phoneNumber)}`, siteUrl).toString();
  }
  const reply = canCreateOrder ? `আপনার অর্ডারটি হয়েছে। অর্ডার নম্বর: ${orderNo}। ট্র্যাক করুন: ${trackingUrl}। ইনভয়েস দেখুন: ${invoiceUrl}` : "তথ্য পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
  const [inbound, outbound] = await prisma.$transaction([
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "MESSENGER", direction: "INBOUND", authorType: "CUSTOMER", content: `${product.title}\nনাম: ${customerName}\nফোন: ${phoneNumber}\nঠিকানা: ${deliveryAddress}${canCreateOrder ? `, ${clean(body.thana)}, ${clean(body.district)}` : ""}`, deliveryStatus: "DELIVERED", metadata: { type: canCreateOrder ? "CHAT_ORDER_FORM" : "CHAT_CONTACT_FORM", productId: product.id, orderNo } } }),
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "MESSENGER", direction: "OUTBOUND", authorType: "AI", content: reply, deliveryStatus: "SENDING", metadata: { type: canCreateOrder ? "ORDER_PLACED" : "CONTACT_RECEIVED", productId: product.id, orderNo, trackingUrl, invoiceUrl } } }),
    prisma.chatConversation.update({ where: { id: conversation.id }, data: { customerName, customerPhone: phoneNumber, normalizedPhone: phoneNumber.startsWith("88") ? `0${phoneNumber.slice(2)}` : phoneNumber, status: canCreateOrder ? "OPEN" : "PENDING", ...(!canCreateOrder && { aiModeEnabled: false }), unreadCount: { increment: 1 }, lastMessageAt: new Date() } }),
  ]);
  after(async () => {
    await sendChatPushNotification({ conversationId: conversation.id, channel: "MESSENGER", customerName, customerPhone: phoneNumber, content: inbound.content }).catch(() => {});
    try {
      const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : null;
      if (!credentials) throw new Error("Messenger credentials unavailable.");
      const sent = await sendChatChannelTextMessage(conversation, reply, credentials);
      await prisma.chatMessage.update({ where: { id: outbound.id }, data: { deliveryStatus: "SENT", ...(sent.id && { externalMessageId: sent.id }) } });
    } catch (error) {
      console.warn("Messenger form confirmation could not be delivered:", error?.message || error);
      await prisma.chatMessage.update({ where: { id: outbound.id }, data: { deliveryStatus: "FAILED" } }).catch(() => {});
    }
  });
  return Response.json({ success: true, data: { orderNo, trackingUrl, invoiceUrl, message: reply } }, { headers: { "Cache-Control": "no-store" } });
}
