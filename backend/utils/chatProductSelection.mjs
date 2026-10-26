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
  const action = whatsAppProductAction(message);
  return action?.action === "select" ? action.productId : null;
}

export function chatProductAction(payload) {
  const match = String(payload || "").match(/^(select|order|details):([a-zA-Z0-9_-]{5,80})$/u);
  return match ? { action: match[1], productId: match[2], quickReplyPayload: match[0] } : null;
}

export function whatsAppProductAction(message) {
  return chatProductAction(message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.id || message?.button?.payload);
}

export function whatsAppUrlButtonContent(content, button) {
  const url = new URL(button.url);
  if (url.protocol !== "https:") throw new Error("WhatsApp URL buttons require an HTTPS URL.");
  return {
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: String(content || "পণ্যের তথ্য").slice(0, 1024) },
      action: {
        name: "cta_url",
        parameters: { display_text: String(button.title || "ওয়েবসাইটে কিনুন").slice(0, 20), url: url.href },
      },
    },
  };
}
