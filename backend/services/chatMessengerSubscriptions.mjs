import { createHash } from "node:crypto";

const checks = new Map();
const requiredFields = ["messages", "messaging_postbacks"];

// A Page can receive ordinary messages without being subscribed to card clicks.
// Preserve the existing subscription fields when adding postbacks.
export async function ensureMessengerPostbacks(credentials, { force = false, fetchImpl = fetch } = {}) {
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const pageId = credentials.messengerPageId;
  const token = credentials.messengerPageAccessToken;
  if (!pageId || !token || !/^v\d+\.\d+$/u.test(version || "")) return { ready: false, warning: "Messenger credentials configure করা নেই।" };
  const cacheKey = createHash("sha256").update(`${version}:${pageId}:${token}`).digest("hex");
  const cached = checks.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/subscribed_apps`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const response = await fetchImpl(`${endpoint}?fields=id,subscribed_fields`, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.data)) throw new Error(`subscription_read_${result.error?.code || response.status}`);
    // With several apps, the token's app cannot be identified safely from this response.
    if (result.data.length > 1) throw new Error("multiple_apps_manual_subscription_required");
    const currentFields = result.data[0]?.subscribed_fields || [];
    if (!requiredFields.every((field) => currentFields.includes(field))) {
      const subscribedFields = [...new Set([...currentFields, ...requiredFields])];
      const saved = await fetchImpl(endpoint, { method: "POST", headers, body: JSON.stringify({ subscribed_fields: subscribedFields }), cache: "no-store", signal: AbortSignal.timeout(5000) });
      const savedResult = await saved.json();
      if (!saved.ok || savedResult.success !== true) throw new Error(`subscription_write_${savedResult.error?.code || saved.status}`);
    }
    const resultValue = { ready: true, warning: null };
    checks.set(cacheKey, { result: resultValue, expiresAt: Date.now() + 3600000 });
    return resultValue;
  } catch (error) {
    const resultValue = { ready: false, warning: "Messenger-এর button callback চালু করতে Meta Page webhook-এ messages এবং messaging_postbacks subscription ও token permission যাচাই করুন।" };
    console.warn("Messenger postback subscription check failed:", { code: error?.message || "subscription_failed" });
    checks.set(cacheKey, { result: resultValue, expiresAt: Date.now() + 60000 });
    return resultValue;
  }
}
