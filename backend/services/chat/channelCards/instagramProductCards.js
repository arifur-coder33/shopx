/**
 * Instagram product cards use Meta's Generic Template. Keeping the payload
 * builder here makes the Instagram-specific card shape easy to find and edit.
 */
function priceRange(product) {
  const prices = (product.variants || [])
    .map((variant) => Number(variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice))
    .filter((price) => price > 0);
  if (!prices.length) return "দাম জানতে মেসেজ করুন";
  const low = Math.min(...prices).toLocaleString("en-BD");
  const high = Math.max(...prices).toLocaleString("en-BD");
  return low === high ? `৳${low}` : `৳${low}–৳${high}`;
}

function productElement(product) {
  const options = [...new Set((product.variants || []).flatMap((variant) => variant.options || []))];
  const subtitle = [
    priceRange(product),
    product.productCode ? `SKU: ${product.productCode}` : "",
    options.slice(0, 3).join(" / "),
  ].filter(Boolean).join(" · ").slice(0, 80);
  const image = product.imageUrls?.find((url) => /^https:\/\//iu.test(url));
  return {
    title: String(product.title || "পণ্য").slice(0, 80),
    ...(subtitle && { subtitle }),
    ...(image && { image_url: image }),
    buttons: [
      { type: "web_url", url: product.url, title: "পণ্য দেখুন" },
      { type: "postback", title: "এখনই কিনুন", payload: `order:${product.id}` },
      { type: "postback", title: "আরও জানতে চাই", payload: `details:${product.id}` },
    ],
  };
}

/** Send one product or a horizontally scrollable Instagram carousel. */
export async function sendInstagramProductCards(conversation, products, credentials, seeMoreUrl = null) {
  if (conversation.channel !== "INSTAGRAM") throw new Error("Instagram cards require an Instagram conversation.");
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const pageId = credentials.messengerPageId;
  const pageToken = credentials.messengerPageAccessToken;
  if (!pageId || !pageToken || !/^v\d+\.\d+$/u.test(version || "")) throw new Error("Instagram Messaging credentials configure করা নেই।");
  const elements = products.slice(0, seeMoreUrl ? 9 : 10).map(productElement);
  if (seeMoreUrl) elements.push({ title: "আরও পণ্য দেখুন", buttons: [{ type: "web_url", url: seeMoreUrl, title: "আরও দেখুন" }] });
  const payload = elements.length > 1
    ? { attachment: { type: "template", payload: { template_type: "generic", elements } } }
    : { attachment: { type: "template", payload: { template_type: "generic", elements: [elements[0]] } } };
  const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.message || "Instagram product card পাঠানো যায়নি।");
    error.code = result?.error?.code || `meta_http_${response.status}`;
    throw error;
  }
  return { id: result.message_id || null, secondaryIds: [], warning: null };
}
