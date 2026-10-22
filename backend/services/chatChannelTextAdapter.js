export function buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId = null, quickReplies = []) {
  const text = String(content || "").slice(0, 700);
  if (conversation.channel === "WEBSITE") return null;
  if (["WHATSAPP", "MESSENGER", "INSTAGRAM"].includes(conversation.channel)) {
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    const isWhatsApp = conversation.channel === "WHATSAPP";
    const isInstagram = conversation.channel === "INSTAGRAM";
    const token = isWhatsApp ? credentials.whatsappAccessToken : isInstagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
    const resource = isWhatsApp ? credentials.whatsappPhoneNumberId : isInstagram ? credentials.instagramAccountId : credentials.messengerPageId;
    if (!token || !resource || !/^v\d+\.\d+$/.test(version || "")) throw new Error("এই channel-এর reply credentials configure করা নেই।");
    const reply = replyToExternalMessageId ? { reply_to: { mid: replyToExternalMessageId } } : {};
    const payload = isWhatsApp
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, ...(replyToExternalMessageId && { context: { message_id: replyToExternalMessageId } }), type: "text", text: { body: text, preview_url: true } }
      : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...reply, message: { text, ...(conversation.channel === "MESSENGER" && quickReplies.length && { quick_replies: quickReplies.slice(0, 10).map((option) => ({ content_type: "text", title: String(typeof option === "string" ? option : option.title).slice(0, 20), payload: String(typeof option === "string" ? option : option.payload).slice(0, 1000) })) }) } };
    return {
      provider: isWhatsApp ? "WHATSAPP" : "META",
      url: `https://graph.facebook.com/${version}/${resource}/messages`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: payload,
    };
  }
  if (conversation.channel === "TIKTOK") {
    if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId) throw new Error("TikTok Business Messaging credentials configure করা হয়নি।");
    return {
      provider: "TIKTOK",
      url: "https://business-api.tiktok.com/open_api/v1.3/business/message/send/",
      headers: { "Access-Token": credentials.tiktokAccessToken, "Content-Type": "application/json" },
      body: {
        business_id: credentials.tiktokBusinessId,
        recipient_type: "CONVERSATION",
        recipient: conversation.externalUserId,
        message_type: "TEXT",
        text: { body: text },
        ...(replyToExternalMessageId && { referenced_message_info: { referenced_message_id: replyToExternalMessageId } }),
      },
    };
  }
  throw new Error("এই chat channel-এ text reply supported নয়।");
}

export async function sendChatChannelTextMessage(conversation, content, credentials, replyToExternalMessageId = null, quickReplies = []) {
  const request = buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId, quickReplies);
  if (!request) return { id: null, secondaryIds: [], warning: null };
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (request.provider === "TIKTOK") {
    if (!response.ok || result.code !== 0) {
      const error = new Error(result.message || "TikTok message পাঠানো যায়নি।");
      error.code = result.code || `tiktok_http_${response.status}`;
      throw error;
    }
    return { id: result.data?.message_id || null, secondaryIds: [], warning: null };
  }
  if (!response.ok) {
    const error = new Error(result?.error?.message || "Meta message পাঠানো যায়নি।");
    error.code = result?.error?.code || `meta_http_${response.status}`;
    throw error;
  }
  return { id: request.provider === "WHATSAPP" ? result?.messages?.[0]?.id || null : result?.message_id || null, secondaryIds: [], warning: null };
}

export async function sendChatChannelImageMessage(conversation, caption, imageUrl, credentials, replyToExternalMessageId = null) {
  const url = new URL(imageUrl);
  if (url.protocol !== "https:") throw new Error("Product photo URL must use HTTPS.");
  if (conversation.channel === "WEBSITE") return { id: null, secondaryIds: [], warning: null };
  if (["WHATSAPP", "MESSENGER", "INSTAGRAM"].includes(conversation.channel)) {
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    const isWhatsApp = conversation.channel === "WHATSAPP";
    const isInstagram = conversation.channel === "INSTAGRAM";
    const token = isWhatsApp ? credentials.whatsappAccessToken : isInstagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
    const resource = isWhatsApp ? credentials.whatsappPhoneNumberId : isInstagram ? credentials.instagramAccountId : credentials.messengerPageId;
    if (!token || !resource || !/^v\d+\.\d+$/.test(version || "")) throw new Error("এই channel-এর reply credentials configure করা নেই।");
    const endpoint = `https://graph.facebook.com/${version}/${resource}/messages`;
    const body = isWhatsApp
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, ...(replyToExternalMessageId && { context: { message_id: replyToExternalMessageId } }), type: "image", image: { link: imageUrl, ...(caption.trim() && { caption: caption.slice(0, 1000) }) } }
      : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...(replyToExternalMessageId && { reply_to: { mid: replyToExternalMessageId } }), message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } } };
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result?.error?.message || "Product photo পাঠানো যায়নি।"); error.code = result?.error?.code || `meta_http_${response.status}`; throw error; }
    const id = isWhatsApp ? result?.messages?.[0]?.id || null : result?.message_id || null;
    const secondaryIds = [];
    let warning = null;
    if (!isWhatsApp && caption.trim()) {
      const captionResponse = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...(replyToExternalMessageId && { reply_to: { mid: replyToExternalMessageId } }), message: { text: caption.slice(0, 700) } }), cache: "no-store", signal: AbortSignal.timeout(15000) });
      const captionResult = await captionResponse.json().catch(() => ({}));
      if (captionResponse.ok && captionResult.message_id) secondaryIds.push(captionResult.message_id);
      else warning = captionResult?.error?.message || "Photo গেছে, তবে caption পাঠানো যায়নি।";
    }
    return { id, secondaryIds, warning };
  }
  if (conversation.channel === "TIKTOK") {
    if (!/^([a-z0-9-]+\.)*cloudinary\.com$/i.test(url.hostname)) throw new Error("TikTok-এ পাঠানোর photo Media Library-তে থাকতে হবে।");
    if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId) throw new Error("TikTok Business Messaging credentials configure করা হয়নি।");
    const source = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const mimeType = source.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    if (!source.ok || !["image/jpeg", "image/png"].includes(mimeType)) throw new Error("TikTok-এ JPG অথবা PNG photo পাঠানো যাবে।");
    const bytes = await source.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 3 * 1024 * 1024) throw new Error("TikTok photo সর্বোচ্চ 3 MB হতে পারে।");
    const form = new FormData(); form.set("business_id", credentials.tiktokBusinessId); form.set("media_type", "IMAGE"); form.set("file", new Blob([bytes], { type: mimeType }), mimeType === "image/png" ? "product.png" : "product.jpg");
    const uploadResponse = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/media/upload/", { method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken }, body: form, cache: "no-store" });
    const upload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || upload.code !== 0 || !upload.data?.media_id) throw new Error(upload.message || "TikTok-এ photo upload করা যায়নি।");
    const send = async (body) => {
      const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/send/", { method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.code !== 0) throw new Error(result.message || "TikTok message পাঠানো যায়নি।");
      return result.data?.message_id || null;
    };
    const base = { business_id: credentials.tiktokBusinessId, recipient_type: "CONVERSATION", recipient: conversation.externalUserId };
    const id = await send({ ...base, message_type: "IMAGE", image: { media_id: upload.data.media_id } });
    const secondaryIds = caption.trim() ? [await send({ ...base, message_type: "TEXT", text: { body: caption.slice(0, 700) }, ...(replyToExternalMessageId && { referenced_message_info: { referenced_message_id: replyToExternalMessageId } }) })].filter(Boolean) : [];
    return { id, secondaryIds, warning: null };
  }
  throw new Error("এই chat channel-এ photo reply supported নয়.");
}
