export const ORDER_SOURCE_COOKIE = "order_source";
const fields = ["source", "medium", "campaign", "ad", "campaignId", "adId", "channel", "referrer"];
const clean = (value) => typeof value === "string" ? value.trim().slice(0, 120) : "";
export function parseOrderAttribution(value) {
  try {
    const raw = value || "";
    const data = JSON.parse(raw.startsWith("{") ? raw : decodeURIComponent(raw));
    const result = Object.fromEntries(fields.map((key) => [key, clean(data?.[key])]));
    return result.channel ? result : null;
  } catch {
    return null;
  }
}

export function captureOrderAttribution({ includeReferrer = true } = {}) {
  const params = new URLSearchParams(window.location.search);
  const clickId = params.get("fbclid");
  if (clickId) {
    const current = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1];
    if (/^[A-Za-z0-9_-]{1,512}$/.test(clickId)) {
      if (current?.endsWith("." + clickId)) {
        // Keep Meta's original click timestamp when this is the same click.
      } else {
        document.cookie = "_fbc=fb.1." + Date.now() + "." + clickId
          + "; Path=/; Max-Age=7776000; SameSite=Lax"
          + (window.location.protocol === "https:" ? "; Secure" : "");
      }
    } else {
      // Don't associate this visit with an older click ID when a new, invalid
      // fbclid is present. Leave the exact URL value untouched for diagnosis.
      document.cookie = "_fbc=; Path=/; Max-Age=0; SameSite=Lax"
        + (window.location.protocol === "https:" ? "; Secure" : "");
    }
  }
  const get = (key) => clean(params.get(key));
  const source = get("utm_source").toLowerCase();
  const medium = get("utm_medium").toLowerCase();
  let referrer = "";
  if (includeReferrer) {
    try { referrer = new URL(document.referrer).hostname.toLowerCase(); } catch {}
  }
  const external = referrer && referrer !== window.location.hostname;
  const network = get("gclid") || get("gbraid") || get("wbraid") ? "google"
    : get("ttclid") ? "tiktok"
    : get("msclkid") ? "bing" : "";
  const paid = Boolean(network) || /^(cpc|ppc|cpm|paid.*|display|retargeting)$/.test(medium) || Boolean(get("ad_id"));
  const inferred = /(^|\.)google\.[a-z.]+$/.test(referrer) ? "google"
    : /(^|\.)(facebook|instagram|tiktok|bing)\.com$/.test(referrer) ? referrer.split(".").at(-2) : "";
  const resolvedSource = source || network || (external ? inferred || referrer : "");
  const channel = paid ? "Paid Ads"
    : (resolvedSource === "google" || resolvedSource === "bing") && (!medium || medium === "organic") ? "Organic Search"
    : ["facebook", "instagram", "tiktok"].includes(resolvedSource) ? "Organic Social"
    : resolvedSource ? "Referral / Other" : "Direct / Unknown";
  if (!source && !medium && !network && !external && !get("ad_id")) return;
  const data = {
    source: resolvedSource, medium, channel, referrer: external ? referrer : "",
    campaign: get("utm_campaign"), ad: get("utm_content"),
    campaignId: get("campaign_id") || get("utm_id"), adId: get("ad_id"),
  };
  document.cookie = ORDER_SOURCE_COOKIE + "=" + encodeURIComponent(JSON.stringify(data))
    + "; Path=/; Max-Age=2592000; SameSite=Lax" + (window.location.protocol === "https:" ? "; Secure" : "");
}
