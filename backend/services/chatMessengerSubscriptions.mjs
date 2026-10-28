import { createHash } from "node:crypto";

const checks = new Map();
const messengerRequiredFields = ["messages", "messaging_postbacks"];

// A Page can receive ordinary messages without being subscribed to card clicks.
// Preserve the existing subscription fields when adding postbacks.
export async function ensureMessengerPostbacks(credentials, { force = false, fetchImpl = fetch, requiredFields = messengerRequiredFields } = {}) {
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const pageId = credentials.messengerPageId;
  const token = credentials.messengerPageAccessToken;
  const fieldsToEnsure = [...new Set(requiredFields || [])];
  if (!fieldsToEnsure.length) return { ready: true, warning: null };
  if (!pageId || !token || !/^v\d+\.\d+$/u.test(version || "")) return { ready: false, warning: "Meta Page credentials configure করা নেই।" };
  const cacheKey = createHash("sha256").update(`${version}:${pageId}:${token}:${fieldsToEnsure.join(",")}`).digest("hex");
  const cached = checks.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now()) return cached.result;

  try {
    const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/subscribed_apps`;
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const response = await fetchImpl(`${endpoint}?fields=id,subscribed_fields`, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    const result = await response.json();
    if (!response.ok || !Array.isArray(result.data)) throw new Error(`subscription_read_${result.error?.code || response.status}`);
    let subscribedApp = result.data[0];
    // Another app's subscription does not deliver callbacks to this app.
    if (result.data.length > 1) {
      const appResponse = await fetchImpl(`https://graph.facebook.com/${version}/app?fields=id`, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
      const app = await appResponse.json();
      if (!appResponse.ok || !app.id) throw new Error("current_app_lookup_failed");
      subscribedApp = result.data.find((entry) => entry.id === app.id);
    }
    const currentFields = subscribedApp?.subscribed_fields || [];
    if (!fieldsToEnsure.every((field) => currentFields.includes(field))) {
      const subscribedFields = [...new Set([...currentFields, ...fieldsToEnsure])];
      const saved = await fetchImpl(endpoint, { method: "POST", headers, body: JSON.stringify({ subscribed_fields: subscribedFields }), cache: "no-store", signal: AbortSignal.timeout(5000) });
      const savedResult = await saved.json();
      if (!saved.ok || savedResult.success !== true) throw new Error(`subscription_write_${savedResult.error?.code || saved.status}`);
    }
    const resultValue = { ready: true, warning: null };
    checks.set(cacheKey, { result: resultValue, expiresAt: Date.now() + 3600000 });
    return resultValue;
  } catch (error) {
    const resultValue = { ready: false, warning: `Meta Page webhook-এ ${fieldsToEnsure.join(", ")} subscription এবং token permission যাচাই করুন।` };
    console.warn("Meta Page webhook field check failed:", { fields: fieldsToEnsure, code: error?.message || "subscription_failed" });
    checks.set(cacheKey, { result: resultValue, expiresAt: Date.now() + 60000 });
    return resultValue;
  }
}
