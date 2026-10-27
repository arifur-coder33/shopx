import { randomUUID } from "node:crypto";
import { createOrder } from "@/backend/serverActions/orderActions";
import { getCheckoutCampaignPreview } from "@/backend/serverActions/checkoutCampaignPreviewAction";
import { sendChatChannelTextMessage, sendChatChannelImageMessage } from "@/backend/services/chatChannelTextAdapter";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { normalizeChatPhone } from "@/lib/chatIdentity";
import { parseBangladeshAddress } from "@/lib/bangladeshAddress";
import { saveAbandonedCheckoutLead } from "@/backend/services/abandonedCheckoutService";
import { newerInboundWhere } from "./chatReplyBatchCore.mjs";
import { signedChatOrderCardUrl } from "@/backend/utils/chatOrderCard.mjs";
import { loadChatOrderCard, renderChatOrderCard } from "@/backend/services/chatOrderCardService";

const digits = (text) => String(text || "").replace(/[০-৯]/gu, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
const yes = /^(?:হ্যাঁ|হ্যা|জি|জী|ha|hya|ji|yes|confirm)[.!\s]*$/iu;
const no = /^(?:না|na|no)[.!\s]*$/iu;
const cancel = /^(?:cancel|বাতিল|stop)[.!\s]*$/iu;
const wantsToOrder = /(?:অর্ডার\s*(?:করতে|দিতে)\s*চাই|কিনতে\s*চাই|নিতে\s*চাই|\border\s*(?:korte|dite)\s*chai\b|\b(?:i\s+)?want\s+to\s+order\b)/iu;
// Let unrelated questions and social openers reach the normal AI path while
// preserving the saved checkout step for the customer's next order detail.
const checkoutInterruption = /(?:[?？]|\b(?:what|why|when|where|which|who|how|price|cost|color|colour|size|stock|available|delivery|charge|koto|kemon|keno|kokhon|kothay|kon|ki|dam|rong|size|ache|ase|bhai|apu|hello|hi|salam|assalamu|thanks|thank you)\b|কী|কি|কেমন|কেন|কখন|কোথায়|কোথায়|কোন|দাম|মূল্য|রং|সাইজ|স্টক|আছে|হবে|পাব|ডেলিভারি|চার্জ|ভাই|আপু|সালাম|আসসালামু|হ্যালো|হাই|ধন্যবাদ)/iu;
const prompts = {
  name: "আপনার নাম লিখুন।", phone: "আপনার মোবাইল নম্বরটি দিন (যেমন 01712345678)।",
  address: "একটি পূর্ণ ডেলিভারি ঠিকানা লিখুন—বাসা/রোড/এলাকা, থানা ও জেলা একসাথে। যেমন: House 34, Road 11, Sector 11, Uttara, Dhaka।",
  customerDetails: "অর্ডার করতে আপনার নাম, ফোন নম্বর ও পূর্ণ ঠিকানা (বাসা/এলাকা, থানা, জেলা) এক মেসেজে লিখুন।",
  area: "ঠিকানাটি কি ঢাকা সিটির মধ্যে? ভিতরে বা বাইরে বেছে নিন।",
};
const label = (variant) => variant.combinations.map((part) => `${part.variationName?.name}: ${part.variationValue?.value}`).join(" / ") || "সাধারণ";
const orderable = (product) => product.variations.filter((variant) => product.allowOutOfStockOrder || variant.stocks.some((stock) => stock.available > 0));
const isDhaka = (value) => /^(?:ঢাকা|ঢাকা জেলা|ঢাকা সিটি|ঢাকা শহর|dhaka|dhaka district|dhaka city|dhaka zilla|dacca)$/iu.test(String(value).trim());
const money = (value) => `৳${Number(value).toLocaleString("bn-BD")}`;
const moreItemsPrompt = (product) => `আপনি কি “${product.title}”-এর সঙ্গে আরও কিছু অর্ডার করবেন, নাকি শুধু এটিই?`;
const productOrderUrl = (product, siteUrl) => new URL(
  product.hasVariations || product.variations.length > 1
    ? `/product/${encodeURIComponent(product.slug)}`
    : `/buynow/${encodeURIComponent(product.slug)}`,
  siteUrl,
).href;
const fields = { name: "customerName", phone: "phoneNumber", district: "district", thana: "thana", address: "deliveryAddress" };
const validField = (field, value) => field === "phone" ? /^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/u.test(value)
  : value.length >= (field === "address" ? 5 : 2) && value.length <= (field === "address" ? 250 : 100);

function fieldParts(step, text) {
  const parts = text.split(/\n+/u).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2 || step.startsWith("lead_")) return [text.replace(/\n+/gu, " ")];
  if (step === "name") {
    const phoneIndex = parts.findIndex((part) => validField("phone", part.replace(/[^\d]/gu, "")));
    return phoneIndex > 0 ? [parts.slice(0, phoneIndex).join(" "), ...parts.slice(phoneIndex)] : [parts.join(" ")];
  }
  if (["phone", "district", "thana"].includes(step)) return parts;
  return [parts.join(", ")];
}

function parseCustomerDetails(text, expectedFields = []) {
  const input = digits(text).trim();
  const lines = input.split(/\n+/u).map((line) => line.trim()).filter(Boolean);
  const labelled = (pattern) => input.match(pattern)?.[1]?.trim().replace(/\s+/gu, " ") || "";
  const labelledName = labelled(/(?:^|[\n,;|])\s*(?:নাম|name)\s*[:：=-]\s*([^,\n;|]+)/iu);
  const labelledPhone = labelled(/(?:^|[\n,;|])\s*(?:ফোন|মোবাইল|phone|mobile|whatsapp)\s*[:：=-]\s*([^,\n;|]+)/iu);
  const labelledAddress = labelled(/(?:^|\n)\s*(?:(?:পূর্ণ|ডেলিভারি)\s*)?(?:ঠিকানা|address)\s*[:：=-]\s*([\s\S]*)/iu);
  const phonePattern = /(?:\+?\s*88[\s-]*)?0?1[3-9](?:[\s-]*\d){8}/u;
  const phoneMatch = (labelledPhone || input).match(phonePattern);
  const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\D/gu, "") : "";
  const nameBeforePhone = phoneMatch && !labelledPhone ? input.slice(0, phoneMatch.index).replace(/[\s,;|:-]+$/gu, "").trim() : "";
  const addressAfterPhone = phoneMatch && !labelledPhone ? input.slice(phoneMatch.index + phoneMatch[0].length).replace(/^[\s,;|:-]+/gu, "").trim() : "";
  let customerName = labelledName || nameBeforePhone;
  let deliveryAddress = labelledAddress || addressAfterPhone;
  if (!customerName && expectedFields.includes("customerName") && !phoneMatch && !labelledAddress) customerName = lines[0] || "";
  if (!deliveryAddress && expectedFields.includes("deliveryAddress") && !phoneMatch && !labelledName && !labelledPhone) deliveryAddress = input;
  customerName = customerName.replace(/^(?:নাম|name)\s*[:：=-]\s*/iu, "").trim().slice(0, 100);
  deliveryAddress = deliveryAddress.replace(/^(?:(?:পূর্ণ|ডেলিভারি)\s*)?(?:ঠিকানা|address)\s*[:：=-]\s*/iu, "").trim().replace(/\s+/gu, " ").slice(0, 250);
  return { customerName, phoneNumber, deliveryAddress };
}

async function currentProduct(id) {
  if (!id) return null;
  return prisma.product.findFirst({ where: { id, isActive: true, status: "ACTIVE" }, select: {
    id: true, title: true, slug: true, hasVariations: true, allowOutOfStockOrder: true, codAvailable: true, advancePaymentType: true,
    thumbnail: { select: { url: true, name: true } }, gallery: { take: 1, select: { media: { select: { url: true, name: true } } } },
    variations: { orderBy: { id: "asc" }, select: { id: true, regularPrice: true, discountPrice: true, thumbnail: { select: { url: true, name: true } },
      stocks: { select: { available: true } },
      combinations: { select: { variationName: { select: { name: true } }, variationValue: { select: { value: true } } } },
    } },
  } });
}

async function quoteFor(flow) {
  const items = flow.cartItems?.length ? flow.cartItems : [{ variationId: flow.variantId, quantity: 1 }];
  const result = await getCheckoutCampaignPreview({ items: items.map((item) => ({ variationId: item.variantId || item.variationId, quantity: Number(item.quantity) || 1 })), deliveryArea: flow.deliveryArea, paymentMethod: "COD" });
  if (!result.success || !Number.isFinite(result.data?.deliveryCharge) || !Number.isFinite(result.data?.total)) throw new Error("অর্ডারের হিসাব পাওয়া যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।");
  return { productPrice: result.data.merchandiseTotal, deliveryCharge: result.data.deliveryCharge, total: result.data.total };
}

function summaryText(products, flow) {
  const items = flow.cartItems?.length ? flow.cartItems : [{ productId: products[0]?.id, variantId: flow.variantId, quantity: 1 }];
  const itemLines = items.map((item, index) => {
    const product = products.find((candidate) => candidate.id === item.productId) || products[0];
    const variant = product?.variations.find((candidate) => candidate.id === (item.variantId || item.variationId));
    if (!product) return "";
    return [`${index + 1}. ${product.title} × ${Number(item.quantity) || 1}`, variant?.combinations.length ? `ভ্যারিয়েশন: ${label(variant)}` : ""].filter(Boolean).join("\n");
  }).filter(Boolean);
  return ["অর্ডারের তথ্য একবার মিলিয়ে নিন:", ...itemLines,
    `নাম: ${flow.customerName}`, `ফোন: ${flow.phoneNumber}`,
    `ঠিকানা: ${flow.deliveryAddress}`,
    `ডেলিভারি: ${flow.deliveryArea === "inside-dhaka" ? "ঢাকা সিটির মধ্যে" : "ঢাকা সিটির বাইরে"}`,
    `পণ্যের দাম: ${money(flow.quote.productPrice)}`, `ডেলিভারি চার্জ: ${money(flow.quote.deliveryCharge)}`,
    `সর্বমোট: ${money(flow.quote.total)}`, "পেমেন্ট: ক্যাশ অন ডেলিভারি",
    "সব ঠিক থাকলে Place order চাপুন। সংশোধনের জন্য Update, বাতিল করতে Cancel চাপুন।",
  ].filter(Boolean).join("\n");
}

async function productsForFlow(flow, current) {
  const ids = [...new Set((flow.cartItems || []).map((item) => item.productId).filter(Boolean))];
  if (current?.id && !ids.includes(current.id)) ids.push(current.id);
  const products = await Promise.all(ids.map((id) => id === current?.id ? current : currentProduct(id)));
  return products.filter(Boolean);
}

function withCartItem(flow, product, variant) {
  const item = { productId: product.id, variantId: variant.id, quantity: 1 };
  const previous = flow.cartItems || [];
  return { ...flow, cartItems: flow.editing && previous.length ? [...previous.slice(0, -1), item] : [...previous, item] };
}

async function saveAbandonedFlow(flow, product, deliveryAddress = flow.deliveryAddress) {
  const phoneNumber = normalizeChatPhone(flow.phoneNumber);
  if (!phoneNumber) return;
  const entries = flow.cartItems?.length ? flow.cartItems : product && flow.variantId ? [{ productId: product.id, variantId: flow.variantId, quantity: 1 }] : [];
  const products = await Promise.all([...new Set(entries.map((item) => item.productId))].map((id) => id === product?.id ? product : currentProduct(id)));
  await saveAbandonedCheckoutLead({
    customerName: flow.customerName,
    phoneNumber,
    district: flow.district,
    thana: flow.thana,
    deliveryAddress,
    deliveryArea: flow.deliveryArea,
    items: entries.map((item) => {
      const selectedProduct = products.find((candidate) => candidate?.id === item.productId);
      const variant = selectedProduct?.variations?.find((row) => row.id === (item.variantId || item.variationId));
      const regularPrice = Number(variant?.regularPrice) || 0;
      const salePrice = Number(variant?.discountPrice) || 0;
      return { name: selectedProduct?.title || product?.title || "Product", quantity: Number(item.quantity) || 1, price: salePrice > 0 && salePrice < regularPrice ? salePrice : regularPrice, productUrl: selectedProduct?.slug ? `/product/${selectedProduct.slug}` : null };
    }),
  }).catch(() => {});
}

// Website and social channels use the same persisted checkout steps.
export async function handleChatOrderFlow({ conversation, inbound, credentials, canCreateOrder = true, existingOnly = false, startProductId }) {
  if (/^(?:select|details):[a-zA-Z0-9_-]{5,80}$/u.test(String(inbound.metadata?.quickReplyPayload || "")) || ["select", "details"].includes(inbound.metadata?.action)) {
    // Product details buttons must not be consumed as a name/phone/variant in an unfinished checkout.
    await prisma.chatMessage.updateMany({ where: { aiReplyForMessageId: inbound.id, deliveryStatus: "SENDING" }, data: {
      metadata: { chatOrderFlow: { step: "done", reason: "product_selection" } },
    } });
    return false;
  }
  const recent = await prisma.chatMessage.findMany({ where: { conversationId: conversation.id, direction: "OUTBOUND", OR: [
    { deliveryStatus: { not: "FAILED" } }, { metadata: { path: ["chatOrderFlow", "orderNo"], string_starts_with: "" } },
  ] },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, select: { metadata: true } });
  const saved = recent.find((message) => message.metadata?.chatOrderFlow)?.metadata.chatOrderFlow;
  let flow = saved && saved.step !== "done" ? saved : null;
  const text = digits(inbound.content).trim();
  const latestText = digits(inbound.metadata?.batchedLatestText ?? text).trim();
  const payload = String(inbound.metadata?.quickReplyPayload || "");
  const quickProductId = payload.match(/^order:([a-zA-Z0-9_-]{5,80})$/u)?.[1];
  if (quickProductId && ["await_product", "more_items"].includes(flow?.step)) flow = { ...flow, step: "add_product", productId: quickProductId };
  else if (quickProductId) flow = null;
  const isCheckoutAction = /^checkout:[a-f0-9-]{36}:[a-f0-9-]{36}:/u.test(payload);
  const isDetailsStep = ["customer_details", "lead_details"].includes(flow?.step);
  const hasCustomerDetails = /(?:নাম|name|ফোন|মোবাইল|phone|mobile|ঠিকানা|address)\s*[:：=-]/iu.test(text)
    || /(?:\+?\s*88\s*)?0?1[3-9](?:[\s-]*\d){8}/u.test(text);
  if (flow && !quickProductId && !isCheckoutAction && !cancel.test(latestText) && checkoutInterruption.test(text) && !(isDetailsStep && hasCustomerDetails)) return false;
  const actionMatch = payload.match(/^checkout:([a-f0-9-]{36}):([a-f0-9-]{36}):(.+)$/u);
  if (actionMatch && (!flow || actionMatch[1] !== flow.id || actionMatch[2] !== flow.version)) return persistReply({ conversation, inbound, credentials, text: "এই পুরোনো বাটনটি আর সক্রিয় নেই। সর্বশেষ অর্ডার মেসেজের বাটন ব্যবহার করুন।", flow: saved || { step: "done" }, preserveFlow: true });
  const action = actionMatch?.[3] || (cancel.test(latestText) ? latestText : text);
  const wantsOrder = yes.test(action) || wantsToOrder.test(latestText) || wantsToOrder.test(text);
  // During product confirmation, free text may be a question about the product.
  // Let the catalog-aware AI answer it and keep this checkout step for later.
  if (flow?.step === "product_confirm" && !wantsOrder && !no.test(action) && !cancel.test(action) && !isCheckoutAction) return false;
  const intent = Boolean(quickProductId) || /(?:অর্ডার\s*(?:কর|দিতে)|\border\s*(?:kor|korte|dite|now)|কিনতে চাই|নিতে চাই|\b(?:buy|purchase)\b)/iu.test(text);
  if (!flow && existingOnly && !quickProductId && !actionMatch) return false;
  if (!flow && !intent) return false;
  let next = flow ? { ...flow } : null;
  let reply = "";
  let product;
  let photo = false;
  const siteUrl = await getSiteUrl();
  let trackingUrl;
  let invoiceUrl;
  let orderNo;
  let orderCardImageUrl = null;
  if (flow && (cancel.test(action) || action === "cancel")) {
    next = { step: "done" }; reply = "ঠিক আছে, অর্ডারটি বাতিল করেছি। কোনো অর্ডার তৈরি হয়নি।";
  } else if (!flow) {
    const source = recent.find((message) => message.metadata?.selectedProductId || message.metadata?.productOptions?.length === 1);
    const productId = quickProductId || inbound.metadata?.productId || (startProductId !== undefined ? startProductId : source?.metadata?.selectedProductId || source?.metadata?.productOptions?.[0]?.id);
    product = await currentProduct(productId);
    if (!product && canCreateOrder) { reply = "কোন পণ্যটি অর্ডার করতে চান? পণ্যের নাম, লিংক বা কার্ডটি বেছে দিন।"; next = { step: "done" }; }
    else if (quickProductId && product) {
      const variants = orderable(product);
      if (!variants.length) { reply = "দুঃখিত, পণ্যটি এখন অর্ডার করা যাচ্ছে না।"; next = { step: "done" }; }
      else if (product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)) {
        next = { step: "done" };
        reply = `এই পণ্যে অগ্রিম/অনলাইন পেমেন্ট লাগে। পণ্যটি দেখতে ও অর্ডার করতে এই লিংকে যান: ${productOrderUrl(product, siteUrl)}`;
      }
      else if (product.hasVariations || variants.length > 1 || variants[0].combinations.length) {
        next = { id: randomUUID(), step: "variant", productId: product.id, leadOnly: !canCreateOrder };
        reply = `“${product.title}” অর্ডার করতে কোন ভ্যারিয়েশনটি চান? নিচের অপশন থেকে বেছে নিন।`;
      } else {
        next = { id: randomUUID(), step: canCreateOrder ? "more_items" : "lead_details", productId: product.id, variantId: variants[0].id, cartItems: [{ productId: product.id, variantId: variants[0].id, quantity: 1 }] };
        reply = canCreateOrder ? moreItemsPrompt(product) : prompts.customerDetails;
      }
      photo = true;
    } else {
      next = { id: randomUUID(), step: canCreateOrder ? "product_confirm" : "lead_details", productId: product?.id || null };
      reply = canCreateOrder ? `আপনি কি “${product.title}” পণ্যটি অর্ডার করতে চান? হ্যাঁ বা না বেছে নিন।` : prompts.customerDetails;
      photo = Boolean(product);
    }
  } else {
    product = await currentProduct(flow.productId);
    const websiteUrl = product ? productOrderUrl(product, siteUrl) : null;
    if (!canCreateOrder && !flow.step.startsWith("lead_")) { next = { ...flow, step: "lead_details" }; reply = prompts.customerDetails; }
    else if (!product && !flow.step.startsWith("lead_")) { next = { step: "done" }; reply = "এই পণ্যটি এখন পাওয়া যাচ্ছে না। অন্য পণ্যটি বেছে দিন।"; }
    else if (flow.variantId && !["product_confirm", "variant", "edit", "add_product", "await_product", "more_items"].includes(flow.step) && !flow.step.startsWith("lead_") && !orderable(product).some((variant) => variant.id === flow.variantId)) {
      if (orderable(product).length) { next = { ...flow, step: "variant", editing: Boolean(flow.quote) }; reply = "আগের ভ্যারিয়েশনটি এখন নেওয়া যাচ্ছে না। আরেকটি ভ্যারিয়েশন বেছে নিন।"; }
      else { next = { step: "done" }; reply = "পণ্যটি এখন স্টকে নেই।"; }
    }
    else if (flow.step === "add_product") {
      const variants = orderable(product);
      if (!variants.length) { next = { ...flow, step: "await_product", productId: null }; reply = "দুঃখিত, এই পণ্যটি এখন অর্ডার করা যাচ্ছে না। অন্য পণ্য বেছে নিন।"; }
      else if (product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)) { next = { ...flow, step: "await_product", productId: null }; reply = `“${product.title}” অগ্রিম পেমেন্টের পণ্য, তাই একই chat order-এ যোগ করা যাচ্ছে না। অন্য COD পণ্য বেছে নিন অথবা ওয়েবসাইটে অর্ডার করুন: ${productOrderUrl(product, siteUrl)}`; }
      else if (product.hasVariations || variants.length > 1 || variants[0].combinations.length) { next = { ...flow, step: "variant" }; reply = `“${product.title}” যোগ করতে কোন ভ্যারিয়েশনটি চান? নিচের অপশন থেকে বেছে নিন।`; }
      else { next = withCartItem({ ...flow, step: flow.leadOnly ? "lead_details" : "more_items", variantId: variants[0].id }, product, variants[0]); reply = flow.leadOnly ? prompts.customerDetails : moreItemsPrompt(product); }
    } else if (flow.step === "product_confirm") {
      if (no.test(action) || action === "no") { next = { step: "done" }; reply = "ঠিক আছে। কোন পণ্যটি নিতে চান, সেটি বেছে দিন।"; }
      else if (wantsOrder || action === "yes") {
        if (product.codAvailable === false || ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)) { next = { step: "done" }; reply = `এই পণ্যে অগ্রিম/অনলাইন পেমেন্ট লাগে। অর্ডার করতে এই লিংকে যান: ${websiteUrl}`; }
        else {
          const variants = orderable(product);
          if (!variants.length) { next = { step: "done" }; reply = "পণ্যটি এখন স্টকে নেই।"; }
          else if (product.hasVariations || variants.length > 1 || variants[0].combinations.length) { next = { ...flow, step: "variant" }; reply = "কোন ভ্যারিয়েশনটি নিতে চান? নিচের নাম বা নম্বর লিখুন।"; }
          else { next = withCartItem({ ...flow, step: flow.leadOnly ? "lead_details" : "more_items", variantId: variants[0].id }, product, variants[0]); reply = flow.leadOnly ? prompts.customerDetails : moreItemsPrompt(product); }
        }
      } else reply = "এই পণ্যটিই কি অর্ডার করবেন? হ্যাঁ বা না বলুন।";
    } else if (flow.step === "variant") {
      const variants = orderable(product);
      const selected = action.startsWith("variant_") ? variants.find((variant) => variant.id === action.slice(8))
        : variants[Number(action.match(/^([1-9]\d*)(?:\.|$)/u)?.[1]) - 1] || variants.find((variant) => label(variant).toLowerCase() === text.toLowerCase());
      if (!selected) reply = "তালিকা থেকে ভ্যারিয়েশনের নাম বা নম্বর বেছে দিন।";
      else {
        next = withCartItem({ ...flow, step: flow.editing ? "confirm" : flow.leadOnly ? "lead_details" : "more_items", editing: false, variantId: selected.id }, product, selected);
        reply = flow.editing ? "" : flow.leadOnly ? prompts.customerDetails : moreItemsPrompt(product);
        photo = Boolean(selected.thumbnail?.url || selected.thumbnail?.name);
      }
    } else if (flow.step === "more_items") {
      if (/^(?:yes|হ্যাঁ|হ্যা|জি|জী|add|যোগ|যোগ করব|আরও কিছু কিনতে চাই)$/iu.test(action)) { next = { ...flow, step: "await_product" }; reply = "পছন্দের আরেকটি পণ্যের কার্ডে ‘অর্ডার করতে চাই’ চাপুন।"; }
      else if (/^(?:no|না|এতটুকুই|আর না|হবে না|না, শুধু এটিই|না, শুধু একটাই|না শুধু একটাই)$/iu.test(action)) { next = { ...flow, step: "customer_details" }; reply = prompts.customerDetails; }
      else reply = "আরেকটি পণ্য যোগ করতে ‘হ্যাঁ’, শেষ হলে ‘না’ বলুন।";
    } else if (flow.step === "await_product") {
      if (/^(?:no|না|এতটুকুই|আর না|হবে না|না, শুধু এটিই|না, শুধু একটাই|না শুধু একটাই)$/iu.test(action)) { next = { ...flow, step: "customer_details" }; reply = prompts.customerDetails; }
      else reply = "আরও পণ্য যোগ করতে সেই পণ্যের কার্ডে ‘অর্ডার করতে চাই’ চাপুন, অথবা ‘না’ লিখে অর্ডার শেষ করুন।";
    } else if (["customer_details", "lead_details"].includes(flow.step)) {
      const leadOnly = flow.step === "lead_details";
      const phoneValue = String(flow.phoneNumber || "").replace(/\D/gu, "");
      const expectedFields = [
        !validField("name", String(flow.customerName || "")) && "customerName",
        !validField("phone", phoneValue) && "phoneNumber",
        !flow.addressVerified && "deliveryAddress",
      ].filter(Boolean);
      const incoming = parseCustomerDetails(text, expectedFields);
      const customerName = incoming.customerName || flow.customerName || "";
      const phoneNumber = incoming.phoneNumber ? incoming.phoneNumber.replace(/\D/gu, "") : phoneValue;
      const addressText = incoming.deliveryAddress || (flow.addressVerified ? flow.deliveryAddress : "");
      const addressResult = addressText ? parseBangladeshAddress(addressText) : null;
      const addressVerified = addressResult?.valid === true || (flow.addressVerified && !incoming.deliveryAddress);
      next = { ...flow, customerName, phoneNumber, addressVerified };
      if (addressResult?.valid) {
        next.deliveryAddress = addressResult.deliveryAddress;
        next.district = addressResult.district;
        next.thana = addressResult.thana;
      } else if (incoming.deliveryAddress) {
        next.deliveryAddress = incoming.deliveryAddress;
      }

      const missing = [];
      if (!validField("name", customerName)) missing.push("আপনার নামটি পাওয়া যায়নি। নামটি লিখুন।");
      if (!validField("phone", phoneNumber)) missing.push("সঠিক বাংলাদেশি ফোন নম্বরটি লিখুন (যেমন 01712345678)।");
      if (!addressVerified) missing.push(addressResult?.error || prompts.address);
      if (missing.length) reply = missing.join("\n");
      else if (leadOnly) {
        next.step = "done";
        await prisma.chatConversation.update({ where: { id: conversation.id }, data: {
          customerName, customerPhone: phoneNumber, normalizedPhone: normalizeChatPhone(phoneNumber),
          needsHumanAssistant: true, humanAssistantReason: "ORDER_CONTACT",
        } });
        reply = "তথ্য পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সঙ্গে যোগাযোগ করবেন।";
      } else {
        next.deliveryArea = isDhaka(next.district) ? null : "outside-dhaka";
        next.step = isDhaka(next.district) ? "area" : "confirm";
        reply = prompts[next.step] || "";
      }
    } else if (flow.step === "confirm") {
      if (/^(?:update|সংশোধন|পরিবর্তন)$/iu.test(action)) { next = { ...flow, step: "edit" }; reply = "কোন তথ্যটি সংশোধন করবেন? নাম, ফোন, ঠিকানা বা ভ্যারিয়েশন লিখুন।"; }
      else if (/^(?:place|place order|confirm|হ্যাঁ|হ্যা|yes)$/iu.test(action)) {
        const quote = await quoteFor(flow);
        if (Math.abs(quote.total - flow.quote.total) > 0.01 || Math.abs(quote.deliveryCharge - flow.quote.deliveryCharge) > 0.01 || Math.abs(quote.productPrice - flow.quote.productPrice) > 0.01) {
          next = { ...flow, quote };
          const cartProducts = await productsForFlow(next, product);
          reply = `দাম বা ডেলিভারি চার্জ বদলেছে। নতুন হিসাবটি দেখে নিশ্চিত করুন।\n${summaryText(cartProducts, next)}`; photo = true;
        } else {
          const form = new FormData();
          for (const field of ["customerName", "phoneNumber", "district", "thana", "deliveryAddress", "deliveryArea"]) form.set(field, flow[field]);
          form.set("paymentMethod", "COD"); form.set("email", ""); form.set("chatCheckoutKey", `chat:${flow.id}`); form.set("expectedTotal", String(quote.total));
          const orderItems = flow.cartItems?.length ? flow.cartItems : [{ productId: product.id, variantId: flow.variantId, quantity: 1 }];
          const cartProducts = await productsForFlow(flow, product);
          form.set("products", JSON.stringify(orderItems.map((item) => ({ title: cartProducts.find((entry) => entry.id === item.productId)?.title || product.title, productId: item.productId, variation: { id: item.variantId || item.variationId, combinations: [] }, quantity: Number(item.quantity) || 1 }))));
          if (!await canContinue(conversation, inbound)) return true;
          const result = await createOrder(form);
          if (!result.success || !result.data?.orderNo) {
            await saveAbandonedFlow(flow, product);
            reply = `${result.error || "অর্ডারটি তৈরি হয়নি।"} আবার চেষ্টা করতে Place order চাপুন।`;
          }
          else {
            orderNo = result.data.orderNo;
            trackingUrl = new URL(`/tracking/?o=${encodeURIComponent(orderNo)}&p=${encodeURIComponent(result.data.phoneNumber)}`, siteUrl).href;
            invoiceUrl = new URL(`/api/pdf/invoice?o=${encodeURIComponent(orderNo)}&p=${encodeURIComponent(result.data.phoneNumber)}`, siteUrl).href;
            next = { ...flow, step: "done", orderNo, trackingUrl };
            orderCardImageUrl = signedChatOrderCardUrl(orderNo, result.data.phoneNumber, siteUrl);
            reply = `Congratulations! Your order has been placed successfully. 🎉\nঅর্ডার নম্বর: ${orderNo}\nইনভয়েস ও অর্ডারের অবস্থা দেখতে নিচের বাটন ব্যবহার করুন।`;
          }
        }
      } else reply = "অর্ডার করতে Place order, সংশোধন করতে Update, বাতিল করতে Cancel বেছে নিন।";
    } else if (flow.step === "edit") {
      const fields = { name: "name", নাম: "name", phone: "phone", ফোন: "phone", address: "address", ঠিকানা: "address", variant: "variant", ভ্যারিয়েশন: "variant" };
      const field = fields[action.replace(/^edit_/u, "").toLowerCase()];
      if (!field) reply = "নাম, ফোন, ঠিকানা বা ভ্যারিয়েশন বেছে নিন।";
      else { next = { ...flow, step: field, editing: true }; reply = prompts[field] || "নতুন ভ্যারিয়েশনটি বেছে নিন।"; }
    } else if (flow.step === "area") {
      if (/^(?:inside|ভিতরে|ঢাকার ভিতরে|1)$/iu.test(action)) next = { ...flow, deliveryArea: "inside-dhaka", step: "confirm" };
      else if (/^(?:outside|বাইরে|ঢাকার বাইরে|2)$/iu.test(action)) next = { ...flow, deliveryArea: "outside-dhaka", step: "confirm" };
      else reply = prompts.area;
    } else {
      const field = flow.step.replace(/^lead_/u, "");
      const parts = flow.editing ? [text.replace(/\n+/gu, " ")] : fieldParts(flow.step, text);
      const value = field === "phone" ? parts[0].replace(/[^\d]/gu, "") : parts[0];
      const addressResult = field === "address" && !flow.step.startsWith("lead_") ? parseBangladeshAddress(value) : null;
      const valid = addressResult ? addressResult.valid : validField(field, value);
      if (!fields[field]) return false;
      if (!valid) {
        reply = field === "phone" ? "সঠিক বাংলাদেশি মোবাইল নম্বরটি দিন (যেমন 01712345678)।" : addressResult?.error || prompts[field];
        if (addressResult && !addressResult.valid && !flow.step.startsWith("lead_")) await saveAbandonedFlow(flow, product, value);
      }
      else {
        next = { ...flow, [fields[field]]: addressResult?.deliveryAddress || value };
        if (addressResult) { next.district = addressResult.district; next.thana = addressResult.thana; }
        if (flow.step.startsWith("lead_")) {
          next.step = field === "name" ? "lead_phone" : field === "phone" ? "lead_address" : "done";
          reply = next.step === "done" ? "তথ্য পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সঙ্গে যোগাযোগ করবেন।" : prompts[next.step.slice(5)];
          if (next.step === "done") await prisma.chatConversation.update({ where: { id: conversation.id }, data: { customerName: next.customerName, customerPhone: next.phoneNumber, normalizedPhone: normalizeChatPhone(next.phoneNumber), needsHumanAssistant: true, humanAssistantReason: "ORDER_CONTACT" } });
        } else if (flow.editing) {
          next.editing = false;
          if (field === "district") { next.deliveryArea = isDhaka(value) ? null : "outside-dhaka"; next.step = "thana"; next.editing = true; }
          else next.step = !next.deliveryArea ? "area" : "confirm";
          reply = prompts[next.step] || "";
        } else {
          next.step = { name: "phone", phone: "address", district: "address", thana: "address", address: isDhaka(next.district) ? "area" : "confirm" }[field];
          if (field === "district") next.deliveryArea = isDhaka(value) ? null : "outside-dhaka";
          reply = prompts[next.step] || "";
          // A customer may send name, phone and address fields as separate messages in one burst.
          for (let index = 1; index < parts.length && fields[next.step]; index += 1) {
            const current = next.step;
            const extra = current === "address" ? parts.slice(index).join(", ") : current === "phone" ? parts[index].replace(/[^\d]/gu, "") : parts[index];
            const parsedExtraAddress = current === "address" ? parseBangladeshAddress(extra) : null;
            if (current === "address" ? !parsedExtraAddress.valid : !validField(current, extra)) break;
            next[fields[current]] = current === "address" ? parsedExtraAddress.deliveryAddress : extra;
            if (current === "address") { next.district = parsedExtraAddress.district; next.thana = parsedExtraAddress.thana; }
            if (current === "district") next.deliveryArea = isDhaka(extra) ? null : "outside-dhaka";
            next.step = { phone: "address", district: "address", thana: "address", address: isDhaka(next.district) ? "area" : "confirm" }[current];
            reply = prompts[next.step] || "";
            if (current === "address") break;
          }
        }
      }
    }
  if (next?.step === "confirm" && flow.step !== "confirm") { next.quote = await quoteFor(next); const cartProducts = await productsForFlow(next, product); reply = summaryText(cartProducts, next); photo = true; }
  }
  let options = [];
  if (next?.step === "product_confirm") options = [{ title: "হ্যাঁ", action: "yes" }, { title: "না", action: "no" }];
  if (next?.step === "variant" && product) options = orderable(product).map((variant, index) => ({ title: `${index + 1}. ${label(variant)}`, action: `variant_${variant.id}` }));
  if (next?.step === "area") options = [{ title: "ঢাকার ভিতরে", action: "inside" }, { title: "ঢাকার বাইরে", action: "outside" }];
  if (next?.step === "confirm") options = [{ title: "Place order", action: "place" }, { title: "Update", action: "update" }, { title: "Cancel", action: "cancel" }];
  if (next?.step === "more_items") options = [{ title: "আরও কিছু কিনতে চাই", action: "yes" }, { title: "না, শুধু একটাই", action: "no" }];
  if (next?.step === "await_product") options = [{ title: "না, শুধু একটাই", action: "no" }];
  if (next?.step === "edit") options = Object.entries({ name: "নাম", phone: "ফোন", address: "ঠিকানা", variant: "ভ্যারিয়েশন" }).map(([field, title]) => ({ title, action: `edit_${field}` }));
  if (next?.step === "variant") reply += `\n${options.map((option) => option.title).join("\n")}`;
  const selectedVariant = product?.variations?.find((variant) => variant.id === next?.variantId);
  const rawImage = selectedVariant?.thumbnail?.url || (selectedVariant?.thumbnail?.name ? `/uploads/${selectedVariant.thumbnail.name}` : null)
    || product?.thumbnail?.url || (product?.thumbnail?.name ? `/uploads/${product.thumbnail.name}` : null)
    || product?.gallery?.[0]?.media?.url || (product?.gallery?.[0]?.media?.name ? `/uploads/${product.gallery[0].media.name}` : null);
  let imageUrl = orderCardImageUrl;
  if (!imageUrl && photo && rawImage) {
    try { const parsed = new URL(rawImage, siteUrl); if (parsed.protocol === "https:") imageUrl = parsed.href; } catch { imageUrl = null; }
  }
  return persistReply({ conversation, inbound, credentials, text: reply, flow: next || { step: "done" }, options,
    imageUrl, orderNo, trackingUrl, invoiceUrl });
}

async function canContinue(conversation, inbound) {
  const fresh = await prisma.chatConversation.findUnique({ where: { id: conversation.id }, select: { aiModeEnabled: true, assignedToId: true, aiReplyLeaseToken: true } });
  const newer = await prisma.chatMessage.findFirst({ where: newerInboundWhere(inbound), select: { id: true } });
  if (fresh?.aiModeEnabled && !fresh.assignedToId && !newer && (!inbound.replyLeaseToken || fresh.aiReplyLeaseToken === inbound.replyLeaseToken)) return true;
  console.warn("Chat checkout reply superseded or paused:", { channel: conversation.channel, newerInbound: Boolean(newer), aiEnabled: Boolean(fresh?.aiModeEnabled), assignedToHuman: Boolean(fresh?.assignedToId) });
  await prisma.chatMessage.updateMany({ where: { aiReplyForMessageId: inbound.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "FAILED", metadata: { internalOnly: true, aiErrorCode: newer ? "batch_superseded" : "human_takeover" } } });
  return false;
}

async function persistReply({ conversation, inbound, credentials, text, flow, options = [], replyButtons = null, imageUrl, orderNo, trackingUrl, invoiceUrl, urlButton = null, preserveFlow = false }) {
  // An already committed order must keep its receipt/state even if a new message arrived during checkout.
  if (!orderNo && !await canContinue(conversation, inbound)) return true;
  const current = orderNo ? await prisma.chatConversation.findUnique({ where: { id: conversation.id }, select: { aiModeEnabled: true, assignedToId: true } }) : null;
  const humanTookOver = Boolean(orderNo && (!current?.aiModeEnabled || current.assignedToId));
  if (!preserveFlow) flow.version = randomUUID();
  const quickReplies = replyButtons || options.map((option) => ({ title: option.title, payload: `checkout:${flow.id}:${flow.version}:${option.action}` }));
  if (orderNo) await prisma.chatMessage.update({ where: { aiReplyForMessageId: inbound.id }, data: {
    content: text, metadata: { type: "ORDER_PLACED", chatOrderFlow: flow, orderNo, trackingUrl, invoiceUrl, internalOnly: true },
  } });
  let imageWarning;
  let imageDelivered = null;
  const orderLinks = orderNo ? [{ title: "View invoice", url: invoiceUrl }, { title: "Track order", url: trackingUrl }] : [];
  if (orderNo && conversation.channel === "MESSENGER") urlButton = orderLinks;
  if (orderNo && conversation.channel === "WHATSAPP") urlButton = orderLinks[0];
  const sendImage = async () => {
    if (humanTookOver || (!imageUrl && !orderNo) || conversation.channel === "WEBSITE") return;
    try {
      const card = orderNo ? await loadChatOrderCard(orderNo) : null;
      const bytes = card ? await renderChatOrderCard(card, await getSiteUrl()) : null;
      const sourceUrl = imageUrl || new URL("/api/chat/order-card", await getSiteUrl()).href;
      imageDelivered = await sendChatChannelImageMessage(conversation, orderNo ? "" : "পণ্যের ছবি", sourceUrl, credentials, null, null, bytes);
    } catch (error) {
      imageWarning = String(error?.message || "Image delivery failed").slice(0, 200);
      console.error("Chat order image delivery failed:", { orderNo, channel: conversation.channel, message: imageWarning });
    }
  };
  // Messenger quick replies disappear when another message arrives. Send the
  // product photo first so the checkout buttons remain on the latest message.
  if (conversation.channel === "MESSENGER" || orderNo) await sendImage();
  const separateUrlButton = conversation.channel === "WHATSAPP" && quickReplies.length > 0 && urlButton;
  const delivered = humanTookOver ? { id: null } : await sendChatChannelTextMessage(conversation, text, credentials, null, quickReplies, separateUrlButton ? null : urlButton);
  let urlButtonMessage = null;
  if ((separateUrlButton || (orderNo && conversation.channel === "WHATSAPP")) && !humanTookOver) {
    const buttonText = orderNo ? "অর্ডারের অবস্থা দেখুন।" : "ওয়েবসাইটে অর্ডার করতে নিচের বাটন ব্যবহার করুন।";
    const extraButton = orderNo ? orderLinks[1] : urlButton;
    try {
      const sent = await sendChatChannelTextMessage(conversation, buttonText, credentials, null, [], extraButton);
      urlButtonMessage = { conversationId: conversation.id, channel: conversation.channel, direction: "OUTBOUND", authorType: "AI", content: buttonText, deliveryStatus: "SENT", ...(sent.id && { externalMessageId: sent.id }), metadata: { type: "CHAT_URL_BUTTON", urlButton: extraButton, selectedProductId: flow.productId } };
    } catch (error) {
      console.warn("WhatsApp purchase URL button delivery failed:", { code: error?.code || "url_button_failed" });
    }
  }
  if (conversation.channel !== "MESSENGER" && !orderNo) {
    await sendImage();
  }
  const data = {
    conversationId: conversation.id, channel: conversation.channel, direction: "OUTBOUND", authorType: "AI", content: text,
    deliveryStatus: "SENT", ...(delivered.id && { externalMessageId: delivered.id }), aiReplyForMessageId: inbound.id,
    metadata: { type: orderNo ? "ORDER_PLACED" : "CHAT_ORDER_FLOW", ...(!preserveFlow && { chatOrderFlow: flow }), orderProductId: flow.productId || null,
      ...(flow.productId && { selectedProductId: flow.productId }), checkoutOptions: quickReplies,
      ...(urlButton && { urlButton }),
      ...(imageUrl && { image: { url: imageUrl } }), ...(imageWarning && { imageWarning }), ...(orderNo && { orderNo, trackingUrl, invoiceUrl }),
      ...(humanTookOver && { internalOnly: true }),
      batchedMessageIds: inbound.metadata?.batchedMessageIds || [inbound.id],
    },
  };
  await prisma.$transaction([
    prisma.chatMessage.upsert({ where: { aiReplyForMessageId: inbound.id }, create: data, update: data }),
    ...(urlButtonMessage ? [prisma.chatMessage.create({ data: urlButtonMessage })] : []),
    prisma.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), consecutiveAiFailures: 0 } }),
  ]);
  if (orderNo && imageUrl && conversation.channel !== "WEBSITE") {
    await prisma.chatMessage.create({ data: {
      conversationId: conversation.id, channel: conversation.channel, direction: "OUTBOUND", authorType: "AI",
      content: "🎉 Order confirmation card", deliveryStatus: imageWarning ? "FAILED" : "SENT",
      ...(imageDelivered?.id && { externalMessageId: imageDelivered.id }),
      metadata: { type: "ORDER_CONFIRMATION_CARD", image: { url: imageUrl }, orderNo, invoiceUrl, ...(imageWarning && { imageWarning }) },
    } });
  }
  return true;
}
