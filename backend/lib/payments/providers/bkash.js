"use server";

import { getSiteUrl } from "@/lib/siteUrl";
import { createHash } from "node:crypto";
import { getDeploymentMode } from "@/backend/services/deploymentModeService";
import { getCurrentStoreContext } from "@/backend/services/storeContextService";
import { normalizeHostname } from "@/backend/utils/hostname";
import { headers as requestHeaders } from "next/headers";

/**
 * bKash hosted checkout adapter.
 *
 * Flow: grant token -> create payment -> customer visits bKash -> callback ->
 * execute payment. Provider credentials come only from the encrypted provider
 * configuration stored in the database; this file contains shared API paths.
 */

const tokenCache = globalThis.__shopzyBkashTokenCache || new Map();
if (process.env.NODE_ENV !== "production") {
  globalThis.__shopzyBkashTokenCache = tokenCache;
}

const headers = (token, appKey) => ({
  "Content-Type": "application/json",
  ...(token && { authorization: token }),
  ...(appKey && { "x-app-key": appKey }),
});

const parseResponse = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.statusCode && data.statusCode !== "0000")) {
    // Provider-supplied messages can contain account or token details. They
    // must not flow through public server-action responses or callback logs.
    throw new Error(fallback);
  }
  return data;
};

const configurationValues = (providerConfiguration) => {
  const { appKey, appSecret, username, password } =
    providerConfiguration?.credentials || {};
  const baseUrl = providerConfiguration?.config?.baseUrl;
  if ([baseUrl, appKey, appSecret, username, password].some((value) => !value)) {
    throw new Error("bKash credentials are not configured on the server.");
  }
  return { appKey, appSecret, username, password, baseUrl };
};

export async function getBkashToken(providerConfiguration) {
  const values = configurationValues(providerConfiguration);
  // A token belongs to one merchant/environment pair. Keep it server-side and
  // reuse it until shortly before expiry, as required by the bKash flow.
  const cacheKey = createHash("sha256").update(JSON.stringify(values)).digest("hex");
  const cached = tokenCache.get(cacheKey);
  if (cached?.expiresAt > Date.now() + 60_000) return cached.token;

  const response = await fetch(
    `${values.baseUrl}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: values.username,
        password: values.password,
      },
      body: JSON.stringify({
        app_key: values.appKey,
        app_secret: values.appSecret,
      }),
      cache: "no-store",
    },
  );
  const data = await parseResponse(response, "bKash token request failed.");
  if (!data.id_token) throw new Error("bKash did not return an access token.");
  const expiresIn = Math.max(60, Number(data.expires_in) || 3600);
  tokenCache.set(cacheKey, {
    token: data.id_token,
    expiresAt: Date.now() + expiresIn * 1000,
  });
  return data.id_token;
}

export async function createBkashPayment({ payment, providerConfiguration }) {
  const token = await getBkashToken(providerConfiguration);
  const { appKey, baseUrl } = configurationValues(providerConfiguration);
  let callbackOrigin = getSiteUrl();
  if (getDeploymentMode() === "SAAS") {
    const context = await getCurrentStoreContext();
    const requestHost = (await requestHeaders()).get("host");
    const hostname = normalizeHostname(requestHost);
    if (context.type !== "STORE" || context.store.id !== payment.storeId || !hostname) {
      throw new Error("A verified Store hostname is required for bKash callbacks.");
    }
    const isLocal = hostname === "localhost" || hostname.endsWith(".localhost");
    const localPort = isLocal ? new URL(`http://${requestHost}`).port : "";
    callbackOrigin = `${isLocal ? "http" : "https"}://${hostname}${localPort ? `:${localPort}` : ""}`;
  }
  const callbackURL = `${callbackOrigin}/api/py/bkash/callback`;
  const response = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: headers(token, appKey),
    body: JSON.stringify({
      // 0011 is checkout-only: no previously-created customer agreement needed.
      mode: "0011",
      payerReference: payment.order.phoneNumber,
      callbackURL,
      amount: Number(payment.amount).toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: payment.id,
    }),
    cache: "no-store",
  });
  const data = await parseResponse(response, "bKash payment initiation failed.");
  if (!data.bkashURL || !data.paymentID) {
    throw new Error(data.statusMessage || "bKash did not return a payment URL.");
  }
  return data;
}

export async function executeBkashPayment(paymentID, providerConfiguration) {
  const token = await getBkashToken(providerConfiguration);
  const { appKey, baseUrl } = configurationValues(providerConfiguration);
  const response = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
    method: "POST",
    headers: headers(token, appKey),
    body: JSON.stringify({ paymentID }),
    cache: "no-store",
  });
  const data = await parseResponse(response, "bKash payment execution failed.");
  if (data.transactionStatus !== "Completed" || !data.trxID) {
    throw new Error(data.statusMessage || "bKash payment was not completed.");
  }
  return data;
}

export async function queryBkashPayment(paymentID, providerConfiguration) {
  const token = await getBkashToken(providerConfiguration);
  const { appKey, baseUrl } = configurationValues(providerConfiguration);
  const response = await fetch(`${baseUrl}/tokenized/checkout/payment/status`, {
    method: "POST",
    headers: headers(token, appKey),
    body: JSON.stringify({ paymentID }),
    cache: "no-store",
  });
  return parseResponse(response, "bKash payment status query failed.");
}
