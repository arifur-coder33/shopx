import { createOrder } from "@/backend/serverActions/orderActions";
import { sendChatChannelTextMessage } from "@/backend/services/chatChannelTextAdapter";
import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

const phoneValid = (value) =>
  /^(?:01[3-9]\d{8}|8801[3-9]\d{8})$/.test(
    String(value || "").replace(/\D/g, ""),
  );
const orderIntent = /(?:অর্ডার|order|কিনতে চাই|নিতে চাই)/iu;
const inboxChoice = /(?:এখানে|ইনবক্স|inbox|messenger|চ্যাট|chat|^২$|^2$)/iu;
const websiteChoice = /(?:ওয়েবসাইট|ওয়েবসাইট|website|site|^১$|^1$)/iu;
const asciiDigits = (value) =>
  String(value).replace(/[০-৯]/gu, (digit) =>
    String("০১২৩৪৫৬৭৮৯".indexOf(digit)),
  );
const fieldPrompts = {
  name: "অর্ডারের জন্য আপনার নাম লিখুন।",
  phone: "আপনার মোবাইল নম্বর দিন (যেমন 01712345678)।",
  address: "বাসা, রোডসহ সম্পূর্ণ ডেলিভারি ঠিকানা লিখুন।",
  district: "কোন জেলায় পাঠাব? জেলার নাম লিখুন।",
  thana: "থানার নাম লিখুন।",
  area: "ডেলিভারি ঢাকার ভিতরে, নাকি বাইরে? ১. ঢাকার ভিতরে  ২. ঢাকার বাইরে",
  payment: "পেমেন্ট কীভাবে করবেন? ১. ক্যাশ অন ডেলিভারি  ২. অনলাইন পেমেন্ট",
};

async function currentProduct(productId) {
  if (!productId) return null;
  return prisma.product.findFirst({
    where: { id: productId, isActive: true, status: "ACTIVE" },
    select: {
      id: true,
      title: true,
      slug: true,
      allowOutOfStockOrder: true,
      codAvailable: true,
      advancePaymentType: true,
      variations: {
        select: {
          id: true,
          stocks: { select: { available: true } },
          combinations: {
            select: {
              variationName: { select: { name: true } },
              variationValue: { select: { value: true } },
            },
          },
        },
      },
    },
  });
}

export async function handleMessengerOrderFlow({
  conversation,
  inbound,
  credentials,
  canCreateOrder = true,
}) {
  if (conversation.channel !== "MESSENGER") return false;
  const recent = await prisma.chatMessage.findMany({
    where: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      deliveryStatus: { not: "FAILED" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { metadata: true },
  });
  const savedFlow = recent.find(
    (message) => message.metadata?.messengerOrderFlow,
  )?.metadata?.messengerOrderFlow;
  const flow = savedFlow?.step === "done" ? null : savedFlow;
  const text = String(inbound.content || "").trim();
  const quickOrderProductId = String(
    inbound.metadata?.quickReplyPayload || "",
  ).match(/^order:([a-zA-Z0-9_-]{5,80})$/u)?.[1];
  const start =
    !flow &&
    (Boolean(quickOrderProductId) || orderIntent.test(text)) &&
    !/(?:কিভাবে|কীভাবে|how|status|স্ট্যাটাস|cancel|বাতিল)/iu.test(text);
  if (!flow && !start) return false;
  let next = flow ? { ...flow } : null;
  let reply = "";
  const siteUrl = await getSiteUrl();
  if (/^(?:বাতিল|cancel|stop)$/iu.test(text) && flow) {
    next = null;
    reply = "ঠিক আছে, এই অর্ডারের তথ্য নেওয়া বন্ধ করেছি।";
  } else if (start) {
    const source = recent
      .flatMap((message) => message.metadata?.productOptions || [])
      .find((item) => item.id);
    const productId =
      quickOrderProductId ||
      source?.id ||
      recent
        .map((message) => message.metadata?.selectedProductId)
        .find(Boolean);
    if (!productId && canCreateOrder) return false;
    next = { step: canCreateOrder ? "choice" : "lead_name", productId };
    reply = canCreateOrder
      ? "অর্ডার করবেন কীভাবে? ১. ওয়েবসাইটে  ২. এখানেই Messenger-এ।"
      : "আপনার নাম লিখুন। ফোন নম্বর ও ঠিকানা নিয়ে আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
  } else {
    const product = await currentProduct(flow.productId);
    if (!product && !flow.step.startsWith("lead_")) {
      next = null;
      reply = "দুঃখিত, পণ্যটি এখন পাওয়া যাচ্ছে না। অন্য পণ্য চাইলে জানান।";
    } else if (!canCreateOrder && !flow.step.startsWith("lead_")) {
      next = { step: "lead_name", productId: product.id };
      reply =
        "Chat থেকে অর্ডার নেওয়া এখন বন্ধ আছে। আপনার নাম লিখুন; ফোন নম্বর ও ঠিকানা নিয়ে প্রতিনিধি যোগাযোগ করবেন।";
    } else if (flow.step === "lead_name") {
      if (text.length < 2 || text.length > 100)
        reply = "আপনার পূর্ণ নাম লিখুন।";
      else {
        next = { ...next, step: "lead_phone", customerName: text };
        reply = "আপনার মোবাইল নম্বর দিন (যেমন 01712345678)।";
      }
    } else if (flow.step === "lead_phone") {
      if (!phoneValid(text))
        reply = "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)।";
      else {
        next = {
          ...next,
          step: "lead_address",
          phoneNumber: text.replace(/\D/g, ""),
        };
        reply = "আপনার সম্পূর্ণ ঠিকানা লিখুন।";
      }
    } else if (flow.step === "lead_address") {
      if (text.length < 8 || text.length > 250)
        reply = "বাসা, রোডসহ সম্পূর্ণ ঠিকানা লিখুন।";
      else {
        next = null;
        reply = "তথ্য পেয়েছি। আমাদের একজন প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।";
        await prisma.chatConversation.update({
          where: { id: conversation.id },
          data: {
            customerName: flow.customerName,
            customerPhone: flow.phoneNumber,
            normalizedPhone: flow.phoneNumber.startsWith("88")
              ? `0${flow.phoneNumber.slice(2)}`
              : flow.phoneNumber,
            status: "PENDING",
            aiModeEnabled: false,
          },
        });
      }
    } else if (flow.step === "choice") {
      if (websiteChoice.test(text)) {
        next = null;
        reply = `ওয়েবসাইটে অর্ডার করতে ${new URL(`/buynow/${encodeURIComponent(product.slug)}`, siteUrl)} লিংকে যান।\n১. পছন্দের ভ্যারিয়েন্ট বেছে ‘এখনই কিনুন’ চাপুন।\n২. নাম, ফোন, ঠিকানা, জেলা ও থানা লিখুন।\n৩. ঢাকার ভিতরে/বাইরে ও পেমেন্ট পদ্ধতি বেছে ‘Place Order’ চাপুন।`;
      } else if (inboxChoice.test(text)) {
        if (
          product.codAvailable === false ||
          ["DELIVERY_FEE", "PARTIAL"].includes(product.advancePaymentType)
        ) {
          next = null;
          reply = `এই পণ্যে অগ্রিম/অনলাইন পেমেন্ট লাগে। নিরাপদে অর্ডার করতে ${new URL(`/buynow/${encodeURIComponent(product.slug)}`, siteUrl)} লিংকটি ব্যবহার করুন।`;
        } else {
          const variants = product.variations.filter(
            (variant) =>
              product.allowOutOfStockOrder ||
              variant.stocks.some((stock) => stock.available > 0),
          );
          if (!variants.length) {
            next = null;
            reply = "দুঃখিত, এই পণ্যটি এখন স্টকে নেই।";
          } else if (variants.length === 1) {
            next = { ...next, step: "name", variantId: variants[0].id };
            reply = fieldPrompts.name;
          } else {
            next = { ...next, step: "variant" };
            reply = `কোন ভ্যারিয়েন্টটি নিতে চান? নম্বর লিখুন:\n${variants
              .slice(0, 10)
              .map(
                (variant, index) =>
                  `${index + 1}. ${variant.combinations.map((part) => `${part.variationName?.name}: ${part.variationValue?.value}`).join(" / ") || "সাধারণ"}`,
              )
              .join("\n")}`;
          }
        }
      } else
        reply =
          "১ লিখুন ওয়েবসাইটে অর্ডার করতে, অথবা ২ লিখুন এখানে অর্ডার করতে।";
    } else if (flow.step === "variant") {
      const variants = product.variations
        .filter(
          (variant) =>
            product.allowOutOfStockOrder ||
            variant.stocks.some((stock) => stock.available > 0),
        )
        .slice(0, 10);
      const selected =
        variants[Number(asciiDigits(text).match(/^\d+/u)?.[0]) - 1];
      if (!selected)
        reply = `১ থেকে ${variants.length} এর মধ্যে ভ্যারিয়েন্টের নম্বর লিখুন।`;
      else {
        next = { ...next, step: "name", variantId: selected.id };
        reply = fieldPrompts.name;
      }
    } else if (flow.step === "name") {
      if (text.length < 2 || text.length > 100)
        reply = "আপনার পূর্ণ নাম লিখুন।";
      else {
        next = { ...next, step: "phone", customerName: text };
        reply = fieldPrompts.phone;
      }
    } else if (flow.step === "phone") {
      if (!phoneValid(text))
        reply = "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন 01712345678)।";
      else {
        next = {
          ...next,
          step: "address",
          phoneNumber: text.replace(/\D/g, ""),
        };
        reply = fieldPrompts.address;
      }
    } else if (flow.step === "address") {
      if (text.length < 8 || text.length > 250)
        reply = "বাসা, রোডসহ সম্পূর্ণ ঠিকানা লিখুন।";
      else {
        next = { ...next, step: "district", deliveryAddress: text };
        reply = fieldPrompts.district;
      }
    } else if (flow.step === "district") {
      if (text.length < 2 || text.length > 100) reply = fieldPrompts.district;
      else {
        next = { ...next, step: "thana", district: text };
        reply = fieldPrompts.thana;
      }
    } else if (flow.step === "thana") {
      if (text.length < 2 || text.length > 100) reply = fieldPrompts.thana;
      else {
        next = { ...next, step: "area", thana: text };
        reply = fieldPrompts.area;
      }
    } else if (flow.step === "area") {
      const inside = /(?:^১$|^1$|ভিতরে|ভেতরে|inside)/iu.test(text);
      const outside = /(?:^২$|^2$|বাইরে|outside)/iu.test(text);
      if (!inside && !outside) reply = fieldPrompts.area;
      else {
        next = {
          ...next,
          step: "payment",
          deliveryArea: inside ? "inside-dhaka" : "outside-dhaka",
        };
        reply = fieldPrompts.payment;
      }
    } else if (flow.step === "payment") {
      if (/(?:^২$|^2$|অনলাইন|online)/iu.test(text)) {
        next = null;
        reply = `অনলাইন পেমেন্টে অর্ডার করতে এই লিংকে যান: ${new URL(`/buynow/${encodeURIComponent(product.slug)}`, siteUrl)}`;
      } else if (/(?:^১$|^1$|ক্যাশ|cash|cod)/iu.test(text)) {
        next = { ...next, step: "confirm" };
        reply = `${product.title} অর্ডারের তথ্য পেয়েছি।\nনাম: ${flow.customerName}\nফোন: ${flow.phoneNumber}\nঠিকানা: ${flow.deliveryAddress}, ${flow.thana}, ${flow.district}\nডেলিভারি: ${flow.deliveryArea === "inside-dhaka" ? "ঢাকার ভিতরে" : "ঢাকার বাইরে"}\nপেমেন্ট: ক্যাশ অন ডেলিভারি\nসব ঠিক থাকলে “হ্যাঁ” লিখুন, পরিবর্তন করতে “বাতিল” লিখুন।`;
      } else reply = fieldPrompts.payment;
    } else if (flow.step === "confirm") {
      if (!canCreateOrder) {
        next = { step: "lead_name", productId: product.id };
        reply =
          "Chat থেকে অর্ডার নেওয়া এখন বন্ধ আছে। আপনার নাম লিখুন; প্রতিনিধি যোগাযোগ করবেন।";
      } else if (!/^(?:হ্যাঁ|হ্যা|জি|yes|confirm)$/iu.test(text))
        reply = "অর্ডার নিশ্চিত করতে ‘হ্যাঁ’ লিখুন, অথবা ‘বাতিল’ লিখুন।";
      else {
        const variant = product.variations.find(
          (item) => item.id === flow.variantId,
        );
        if (!variant) {
          next = null;
          reply = "ভ্যারিয়েন্টটি এখন পাওয়া যাচ্ছে না। আবার পণ্য বেছে নিন।";
        } else {
          const form = new FormData();
          for (const field of [
            "customerName",
            "phoneNumber",
            "deliveryAddress",
            "district",
            "thana",
            "deliveryArea",
          ])
            form.set(field, flow[field]);
          form.set("paymentMethod", "COD");
          form.set(
            "products",
            JSON.stringify([
              {
                title: product.title,
                productId: product.id,
                variation: { id: variant.id, combinations: [] },
                quantity: 1,
              },
            ]),
          );
          const result = await createOrder(form);
          if (!result?.success || !result.data?.orderNo)
            reply = `${result?.error || "অর্ডার করা যায়নি।"} চাইলে ওয়েবসাইট থেকেও অর্ডার করতে পারেন: ${new URL(`/buynow/${encodeURIComponent(product.slug)}`, siteUrl)}`;
          else {
            next = null;
            reply = `আপনার অর্ডারটি হয়েছে। অর্ডার নম্বর: ${result.data.orderNo}। ট্র্যাক করুন: ${new URL(`/tracking/?o=${encodeURIComponent(result.data.orderNo)}&p=${encodeURIComponent(result.data.phoneNumber)}`, siteUrl)}`;
          }
        }
      }
    } else return false;
  }
  const quickReplyProduct =
    next?.step === "variant" ? await currentProduct(next.productId) : null;
  const quickReplies =
    next?.step === "choice"
      ? ["১. ওয়েবসাইটে", "২. এই চ্যাটে"]
      : next?.step === "variant"
        ? quickReplyProduct?.variations
            .filter(
              (variant) =>
                quickReplyProduct.allowOutOfStockOrder ||
                variant.stocks.some((stock) => stock.available > 0),
            )
            .slice(0, 10)
            .map(
              (variant, index) =>
                `${index + 1}. ${variant.combinations.map((part) => part.variationValue?.value).join("/") || "সাধারণ"}`,
            ) || []
        : next?.step === "area"
          ? ["১. ঢাকার ভিতরে", "২. ঢাকার বাইরে"]
          : next?.step === "payment"
            ? ["১. ক্যাশ অন ডেলিভারি", "২. অনলাইন পেমেন্ট"]
            : next?.step === "confirm"
              ? ["হ্যাঁ", "বাতিল"]
              : [];
  const delivered = await sendChatChannelTextMessage(
    conversation,
    reply,
    credentials,
    null,
    quickReplies,
  );
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      channel: "MESSENGER",
      direction: "OUTBOUND",
      authorType: "AI",
      content: reply,
      deliveryStatus: "SENT",
      externalMessageId: delivered.id,
      aiReplyForMessageId: inbound.id,
      metadata: {
        messengerOrderFlow: next || { step: "done" },
        orderProductId: next?.productId || flow?.productId || null,
      },
    },
  });
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
  return true;
}
