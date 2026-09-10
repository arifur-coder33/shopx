"use server";

import { getSiteUrl } from "@/lib/siteUrl";

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
    throw new Error(data.statusMessage || data.message || fallback);
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
  const cacheKey = `${values.baseUrl}:${values.username}:${values.appKey}`;
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
  const callbackURL = `${await getSiteUrl()}/api/py/bkash/callback`;
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
