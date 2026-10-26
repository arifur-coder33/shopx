export function buildChatTypingRequest(conversation, inbound, credentials, active = true) {
  const channel = conversation.channel;
  if (!["MESSENGER", "WHATSAPP", "INSTAGRAM"].includes(channel)) return null;
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const whatsapp = channel === "WHATSAPP";
  const instagram = channel === "INSTAGRAM";
  const token = whatsapp ? credentials.whatsappAccessToken : instagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
  const resource = whatsapp ? credentials.whatsappPhoneNumberId : instagram ? credentials.instagramAccountId : credentials.messengerPageId;
  if (!token || !resource || !/^v\d+\.\d+$/u.test(version || "")) return null;
  // WhatsApp clears the indicator on delivery or after 25 seconds; it has no
  // typing_off request. Its read/typing receipt requires an inbound message ID.
  if (whatsapp && (!active || !inbound.externalMessageId)) return null;
  return {
    url: `https://graph.facebook.com/${version}/${resource}/messages`,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: whatsapp
      ? { messaging_product: "whatsapp", status: "read", message_id: inbound.externalMessageId, typing_indicator: { type: "text" } }
      : { recipient: { id: conversation.externalUserId }, sender_action: active ? "typing_on" : "typing_off" },
  };
}

// Indicators are best effort and never block or fail the actual chat reply.
export function startChatTypingIndicator(conversation, inbound, credentials, {
  fetchImpl = fetch, schedule = setInterval, unschedule = clearInterval,
  isActive = async () => true, warn = console.warn,
} = {}) {
  if (!buildChatTypingRequest(conversation, inbound, credentials)) return async () => {};
  let stopped = false, started = false, pending = null;
  const send = async (active) => {
    const request = buildChatTypingRequest(conversation, inbound, credentials, active);
    if (!request) return;
    const response = await fetchImpl(request.url, {
      method: "POST", headers: request.headers, body: JSON.stringify(request.body),
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`typing_http_${response.status}`);
    started = active;
  };
  const refresh = () => {
    if (stopped || pending) return;
    pending = (async () => {
      if (!await isActive()) {
        stopped = true;
        unschedule(timer);
        if (started) await send(false);
        return;
      }
      await send(true);
    })().catch((error) => {
      stopped = true;
      unschedule(timer);
      warn("Chat typing indicator unavailable:", { channel: conversation.channel, code: error?.message || "typing_failed" });
    }).finally(() => { pending = null; });
  };
  const timer = schedule(refresh, 10000);
  timer?.unref?.();
  refresh();
  return async () => {
    stopped = true;
    unschedule(timer);
    await pending;
    if (started) {
      try { await send(false); }
      catch (error) { warn("Chat typing indicator cleanup failed:", { channel: conversation.channel, code: error?.message || "typing_failed" }); }
    }
  };
}
