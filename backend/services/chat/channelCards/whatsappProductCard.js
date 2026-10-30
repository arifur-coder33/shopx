/** Build WhatsApp's image caption and reply actions for one product. */
export function buildWhatsAppProductCard(product) {
  const prices = (product.variants || [])
    .map((variant) => Number(variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice))
    .filter((value) => value > 0);
  const priceText = prices.length
    ? `\n💰 *মূল্য:* ৳${Math.min(...prices).toLocaleString("en-BD")}${Math.max(...prices) !== Math.min(...prices) ? ` – ৳${Math.max(...prices).toLocaleString("en-BD")}` : ""}`
    : "";
  const features = (product.features || []).slice(0, 3).map((feature) => `✔ ${feature}`).join("\n");
  const variations = [...new Set((product.variants || []).flatMap((variant) => variant.options || []))];
  const variationText = variations.length
    ? `🎨 *ভ্যারিয়েশন:* ${variations.slice(0, 8).join(", ")}${variations.length > 8 ? ", আরও আছে" : ""}`
    : "";
  const caption = [
    `🛍️ *${product.title}*${priceText}`,
    product.productCode ? `🏷️ *SKU:* ${product.productCode}` : "",
    variationText,
    features ? `\n${features}` : "",
  ].filter(Boolean).join("\n").slice(0, 950);
  return {
    caption,
    imageUrl: product.imageUrls?.find((url) => url.startsWith("https://")) || null,
    actions: [
      { title: "এখনই অর্ডার করুন", payload: `order:${product.id}` },
      { title: "আরও জানতে চাই", payload: `details:${product.id}` },
    ],
    productUrl: product.url,
  };
}
