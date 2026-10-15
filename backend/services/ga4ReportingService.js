import jwt from "jsonwebtoken";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const GA_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const reportRanges = new Set(["7daysAgo", "28daysAgo", "90daysAgo"]);

async function getAccessToken(serviceAccountJson) {
  let account;
  try {
    account = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("The saved GA4 service account key is not valid JSON.");
  }
  if (!account.client_email || !account.private_key) {
    throw new Error("The GA4 service account key is missing client_email or private_key.");
  }

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    {
      iss: account.client_email,
      scope: GA_SCOPE,
      aud: account.token_uri || TOKEN_URL,
      iat: now,
      exp: now + 3600,
    },
    account.private_key,
    { algorithm: "RS256" },
  );
  const response = await fetch(account.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error("Google rejected the GA4 service account. Check the key and Analytics Data API access.");
  }
  return payload.access_token;
}

async function runReport(accessToken, propertyId, body) {
  const response = await fetch(`${API_BASE}/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = payload?.error?.status;
    if (response.status === 403) {
      throw new Error("GA4 denied report access. Enable the Analytics Data API and grant the service account Viewer access to this property.");
    }
    if (response.status === 404) {
      throw new Error("GA4 property was not found. Check the Property ID in Traffic settings.");
    }
    throw new Error(code ? `GA4 report failed (${code}).` : "GA4 report could not be loaded.");
  }
  return payload;
}

const numberAt = (row, index = 0) => Number(row?.metricValues?.[index]?.value || 0);
const dimensionAt = (row, index = 0) => row?.dimensionValues?.[index]?.value || "—";

export async function loadGa4TrafficReport(range = "7daysAgo") {
  const settings = await getServerSocialTrackingSettings();
  if (!settings.googleAnalyticsPropertyId) {
    throw new Error("Add the GA4 Property ID under Traffic → Tracking Settings.");
  }
  if (!settings.googleAnalyticsServiceAccountJson) {
    throw new Error("Add a GA4 reporting service account JSON key under Traffic → Tracking Settings.");
  }
  if (!reportRanges.has(range)) range = "7daysAgo";

  const accessToken = await getAccessToken(settings.googleAnalyticsServiceAccountJson);
  const dateRanges = [{ startDate: range, endDate: "today" }];
  const [summary, pages, channels, funnel, trend, realtime] = await Promise.all([
    runReport(accessToken, settings.googleAnalyticsPropertyId, {
      dateRanges,
      metrics: ["totalUsers", "sessions", "screenPageViews", "keyEvents"].map((name) => ({ name })),
    }),
    runReport(accessToken, settings.googleAnalyticsPropertyId, {
      dateRanges,
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 10,
    }),
    runReport(accessToken, settings.googleAnalyticsPropertyId, {
      dateRanges,
      dimensions: [{ name: "sessionDefaultChannelGroup" }, { name: "sessionSourceMedium" }],
      metrics: [{ name: "sessions" }, { name: "totalUsers" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    }),
    runReport(accessToken, settings.googleAnalyticsPropertyId, {
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: { values: ["view_item", "add_to_cart", "begin_checkout", "purchase"] },
        },
      },
    }),
    runReport(accessToken, settings.googleAnalyticsPropertyId, {
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "screenPageViews" }, { name: "totalUsers" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
      limit: 100,
    }),
    fetch(`${API_BASE}/properties/${encodeURIComponent(settings.googleAnalyticsPropertyId)}:runRealtimeReport`, {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ metrics: [{ name: "activeUsers" }] }),
      cache: "no-store",
    }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error("GA4 realtime report could not be loaded.");
      return payload;
    }),
  ]);

  const totals = summary.rows?.[0]?.metricValues || [];
  const funnelCounts = Object.fromEntries((funnel.rows || []).map((row) => [dimensionAt(row), numberAt(row)]));
  return {
    activeUsers: numberAt(realtime.rows?.[0]),
    totalUsers: Number(totals[0]?.value || 0),
    sessions: Number(totals[1]?.value || 0),
    pageViews: Number(totals[2]?.value || 0),
    keyEvents: Number(totals[3]?.value || 0),
    pages: (pages.rows || []).map((row) => ({ path: dimensionAt(row), views: numberAt(row), users: numberAt(row, 1) })),
    channels: (channels.rows || []).map((row) => ({ channel: dimensionAt(row), source: dimensionAt(row, 1), sessions: numberAt(row), users: numberAt(row, 1) })),
    trend: (trend.rows || []).map((row) => ({ date: dimensionAt(row), views: numberAt(row), users: numberAt(row, 1) })),
    funnel: [
      { name: "Product views", event: "view_item", count: funnelCounts.view_item || 0 },
      { name: "Add to cart", event: "add_to_cart", count: funnelCounts.add_to_cart || 0 },
      { name: "Begin checkout", event: "begin_checkout", count: funnelCounts.begin_checkout || 0 },
      { name: "Purchases", event: "purchase", count: funnelCounts.purchase || 0 },
    ],
  };
}
