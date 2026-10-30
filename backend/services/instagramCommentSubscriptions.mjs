/** Subscribe the linked Instagram professional account to comment webhooks. */
export async function ensureInstagramCommentSubscription(credentials, { fetchImpl = fetch } = {}) {
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const accountId = credentials.instagramAccountId;
  const token = credentials.messengerPageAccessToken;
  if (!accountId || !token || !/^v\d+\.\d+$/u.test(version || "")) {
    return { ready: false, warning: "Instagram account ID, linked Page token ও Graph API version configure করুন।" };
  }
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(accountId)}/subscribed_apps`;
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  try {
    const currentResponse = await fetchImpl(`${endpoint}?fields=id,subscribed_fields`, {
      headers, cache: "no-store", signal: AbortSignal.timeout(7000),
    });
    const current = await currentResponse.json().catch(() => ({}));
    if (!currentResponse.ok || !Array.isArray(current.data)) throw new Error(current?.error?.message || "instagram_subscription_read_failed");
    let subscribedApp = current.data[0];
    if (current.data.length > 1) {
      const appResponse = await fetchImpl(`https://graph.facebook.com/${version}/app?fields=id`, {
        headers, cache: "no-store", signal: AbortSignal.timeout(7000),
      });
      const app = await appResponse.json().catch(() => ({}));
      if (!appResponse.ok || !app.id) throw new Error("current_meta_app_lookup_failed");
      subscribedApp = current.data.find((entry) => entry.id === app.id);
    }
    const subscribedFields = subscribedApp?.subscribed_fields || [];
    if (subscribedFields.includes("comments")) return { ready: true, warning: null };
    const response = await fetchImpl(endpoint, {
      method: "POST", headers,
      body: JSON.stringify({ subscribed_fields: [...new Set([...subscribedFields, "comments"])] }),
      cache: "no-store", signal: AbortSignal.timeout(7000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.success !== true) throw new Error(result?.error?.message || "instagram_subscription_write_failed");
    return { ready: true, warning: null };
  } catch (error) {
    console.warn("Instagram comment webhook subscription failed:", error?.message || error);
    return { ready: false, warning: "Instagram account-এর comments webhook subscription ও instagram_manage_comments permission যাচাই করুন। Meta App Dashboard-এর Instagram object-এ comments field subscribe করাও প্রয়োজন।" };
  }
}
