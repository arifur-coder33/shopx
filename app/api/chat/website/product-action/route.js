import { createHash } from "node:crypto";
import { after } from "next/server";
import prisma from "@/lib/prisma";
import { createOrder } from "@/backend/serverActions/orderActions";
import { isChatOrderCreationEnabled } from "@/backend/services/chatOrderSettings";
import { sendChatPushNotification } from "@/backend/services/chatPushService";

export const dynamic = "force-dynamic";

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
  if (!/^[a-f0-9-]{36}$/i.test(token) || (!productId && action !== "lead")) return Response.json({ success: false, message: "Invalid request." }, { status: 400 });
  const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalUserId: { channel: "WEBSITE", externalUserId: createHash("sha256").update(token).digest("hex") } }, select: { id: true } });
  if (!conversation) return Response.json({ success: false, message: "Chat পাওয়া যায়নি।" }, { status: 404 });
  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true, quickReplies: true } });
  if (setting?.websiteChatEnabled === false) return Response.json({ success: false, message: "Chat এখন বন্ধ আছে।" }, { status: 403 });
  const canCreateOrder = isChatOrderCreationEnabled(setting);
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
  let reply;
  let metadata = { productId: product?.id || null };
  if (action === "details") {
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
    if (!canCreateOrder) return Response.json({ success: false, message: "Chat থেকে অর্ডার নেওয়া এখন বন্ধ আছে। যোগাযোগের তথ্য দিন।" }, { status: 403 });
    const variantId = clean(body.variantId, 80);
    const variant = variants.find((item) => item.id === variantId);
    if (!variant || !variant.inStock) return Response.json({ success: false, message: "বাছাই করা ভ্যারিয়েন্টটি এখন স্টকে নেই।" }, { status: 400 });
    const fields = { customerName: clean(body.customerName, 100), phoneNumber: clean(body.phoneNumber, 20).replace(/\D/g, ""), deliveryAddress: clean(body.deliveryAddress, 250), district: clean(body.district, 100), thana: clean(body.thana, 100) };
    if (Object.values(fields).some((value) => !value) || !validPhone(fields.phoneNumber) || !["inside-dhaka", "outside-dhaka"].includes(body.deliveryArea)) return Response.json({ success: false, message: "নাম, সঠিক মোবাইল নম্বর, ঠিকানা, জেলা, থানা ও ডেলিভারি এলাকা দিন।" }, { status: 400 });
    const paymentMethod = clean(body.paymentMethod, 10).toUpperCase();
    if (paymentMethod !== "COD") return Response.json({ success: false, message: "অনলাইন পেমেন্টের জন্য ওয়েবসাইটের checkout ব্যবহার করুন।" }, { status: 400 });
    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) form.set(key, value);
    form.set("deliveryArea", body.deliveryArea);
    form.set("paymentMethod", "COD");
    form.set("products", JSON.stringify([{ title: product.title, productId: product.id, variation: { id: variant.id, combinations: [] }, quantity: 1 }]));
    const order = await createOrder(form);
    if (!order?.success || !order.data?.orderNo) return Response.json({ success: false, message: order?.error || "অর্ডার করা যায়নি। আবার চেষ্টা করুন।" }, { status: 400 });
    const trackingUrl = `/tracking/?o=${encodeURIComponent(order.data.orderNo)}&p=${encodeURIComponent(order.data.phoneNumber)}`;
    reply = `আপনার অর্ডারটি হয়েছে। অর্ডার নম্বর: ${order.data.orderNo}। নিচের লিংকে অর্ডারের অবস্থা দেখতে পারবেন।`;
    metadata = { ...metadata, type: "ORDER_PLACED", orderNo: order.data.orderNo, trackingUrl };
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
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content: action === "lead" ? `যোগাযোগের তথ্য:\nনাম: ${body.contactDetails.customerName}\nফোন: ${body.contactDetails.phoneNumber}\nঠিকানা: ${body.contactDetails.deliveryAddress}` : action === "place" ? "অর্ডার নিশ্চিত করুন" : action === "details" ? "এটা সম্পর্কে আরও জানতে চাই" : action === "order" ? "অর্ডার করতে চাই" : action === "website" ? "ওয়েবসাইটে অর্ডার করব" : "এখানে অর্ডার করব", deliveryStatus: "DELIVERED", metadata: { productId: product?.id || null, action } } }),
    prisma.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "OUTBOUND", authorType: "AI", content: reply, deliveryStatus: "SENT", metadata } }),
    prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: action === "lead" ? "PENDING" : "OPEN", ...(action === "lead" && { customerName: body.contactDetails.customerName, customerPhone: body.contactDetails.phoneNumber, normalizedPhone: body.contactDetails.phoneNumber.startsWith("88") ? `0${body.contactDetails.phoneNumber.slice(2)}` : body.contactDetails.phoneNumber, aiModeEnabled: false }), unreadCount: { increment: 1 } } }),
  ]);
  if (action === "lead") after(() => sendChatPushNotification({ conversationId: conversation.id, channel: "WEBSITE", customerName: body.contactDetails.customerName, customerPhone: body.contactDetails.phoneNumber, content: inbound.content }).catch(() => {}));
  return Response.json({ success: true, data: { inboundId: inbound.id, outboundId: outbound.id, metadata } }, { headers: { "Cache-Control": "no-store" } });
}
