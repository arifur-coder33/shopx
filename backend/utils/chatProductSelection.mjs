export function whatsAppImageContent(mediaId, caption, productId = null) {
  if (!productId) return { type: "image", image: { id: mediaId, ...(String(caption || "").trim() && { caption: String(caption).slice(0, 1000) }) } };
  return {
    type: "interactive",
    interactive: {
      type: "button",
      header: { type: "image", image: { id: mediaId } },
      body: { text: String(caption || "পণ্যের তথ্য").slice(0, 1024) },
      action: { buttons: [{ type: "reply", reply: { id: `select:${productId}`, title: "এটি বেছে নিন" } }] },
    },
  };
}

export function whatsAppSelectedProduct(message) {
  const payload = message?.interactive?.button_reply?.id || message?.button?.payload || "";
  return String(payload).match(/^select:([a-zA-Z0-9_-]{5,80})$/u)?.[1] || null;
}
