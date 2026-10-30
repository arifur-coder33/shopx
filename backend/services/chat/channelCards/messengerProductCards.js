import { ensureMessengerPostbacks } from "@/backend/services/chatMessengerSubscriptions.mjs";

function productElement(product) {
  const prices = product.variants.map((variant) => Number(variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice)).filter((value) => value > 0);
  const price = prices.length ? `৳${Math.min(...prices).toLocaleString("en-BD")}${Math.max(...prices) !== Math.min(...prices) ? `–৳${Math.max(...prices).toLocaleString("en-BD")}` : ""}` : "দাম জানতে লিখুন";
  const variants = product.variants.slice(0, 3).map((variant) => variant.options.join(" / ")).filter(Boolean).join(" · ");
  return {
    title: String(product.title).slice(0, 80),
    subtitle: [price, product.productCode ? `SKU: ${product.productCode}` : "", variants || product.features.slice(0, 2).join(" · ")].filter(Boolean).join(" · ").slice(0, 80),
    ...(product.imageUrls?.[0] && { image_url: product.imageUrls[0] }),
    buttons: [
      { type: "web_url", url: product.url, title: "পণ্য দেখুন" },
      { type: "postback", title: "অর্ডার করতে চাই", payload: `order:${product.id}` },
      { type: "postback", title: "আরও জানতে চাই", payload: `details:${product.id}` },
    ],
  };
}

async function sendTemplate(conversation, credentials, elements) {
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!credentials.messengerPageAccessToken || !credentials.messengerPageId || !/^v\d+\.\d+$/u.test(version || "")) throw new Error("Messenger credentials configure করা নেই।");
  const response = await fetch(`https://graph.facebook.com/${version}/${credentials.messengerPageId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "generic", elements } } } }),
    cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.message || "Messenger product card পাঠানো যায়নি.");
    error.code = result?.error?.code || `meta_http_${response.status}`;
    throw error;
  }
  return result.message_id || null;
}

export async function sendMessengerProductCard(conversation, product, credentials, sendTextMessage) {
  if (conversation.channel !== "MESSENGER") throw new Error("Messenger product card requires a Messenger conversation.");
  const subscription = await ensureMessengerPostbacks(credentials);
  const id = await sendTemplate(conversation, credentials, [productElement(product)]);
  const fallback = !subscription.ready ? await sendTextMessage(conversation, "পণ্যটি সম্পর্কে জানতে বা অর্ডার করতে বেছে নিন।", credentials, null, [
    { title: "অর্ডার করতে চাই", payload: `order:${product.id}` }, { title: "আরও জানতে চাই", payload: `details:${product.id}` },
  ]) : null;
  return { id, secondaryIds: fallback?.id ? [fallback.id] : [], warning: subscription.warning };
}

export async function sendMessengerProductCarousel(conversation, products, credentials, seeMoreUrl, sendTextMessage) {
  if (conversation.channel !== "MESSENGER") throw new Error("Messenger carousel requires a Messenger conversation.");
  if (products.length < 2) throw new Error("Messenger carousel needs at least two products.");
  const subscription = await ensureMessengerPostbacks(credentials);
  const elements = products.slice(0, seeMoreUrl ? 9 : 10).map(productElement);
  if (seeMoreUrl) elements.push({ title: "আরও পণ্য দেখুন", subtitle: "বাকি সার্চ রেজাল্ট দেখতে চাপুন", buttons: [{ type: "web_url", url: seeMoreUrl, title: "আরও দেখুন" }] });
  const id = await sendTemplate(conversation, credentials, elements);
  const fallback = !subscription.ready ? await sendTextMessage(conversation, "কোন পণ্যটি সম্পর্কে জানতে চান?", credentials, null,
    products.slice(0, 10).map((product, index) => ({ title: `${index + 1}. ${product.title}`.slice(0, 20), payload: `details:${product.id}` }))) : null;
  return { id, secondaryIds: fallback?.id ? [fallback.id] : [], warning: subscription.warning };
}
