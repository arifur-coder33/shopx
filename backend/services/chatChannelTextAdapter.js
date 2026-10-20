export function buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId = null) {
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
      : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...reply, message: { text } };
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

export async function sendChatChannelTextMessage(conversation, content, credentials, replyToExternalMessageId = null) {
  const request = buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId);
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
