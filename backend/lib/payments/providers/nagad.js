"use server";

import {
  constants,
  createSign,
  createVerify,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto";

/**
 * Nagad Online Payment adapter (merchant guide v3.3, October 2021).
 *
 * Security flow:
 * 1. Encrypt plain sensitive JSON with the Nagad gateway public key using
 *    RSA/PKCS#1 v1.5 padding.
 * 2. Sign that exact plain JSON with the merchant private key using SHA1withRSA.
 * 3. Decrypt Nagad's response with the merchant private key and verify Nagad's
 *    signature before trusting the returned payment reference/challenge.
 * 4. Never credit an order from callback query parameters. The callback handler
 *    calls Check Payment Status and posts money only from that verified response.
 */

const CONTEXT_PATH = "/remote-payment-gateway-1.0/api/dfs";

const cleanPem = (value) => String(value || "").replaceAll("\\n", "\n").trim();
const jsonText = (value) => JSON.stringify(value);
const apiBaseUrl = (baseUrl) => {
  // Onboarding packs commonly provide either host:port, a context-root URL,
  // or the complete /api/dfs base. Accept all three without duplicating paths.
  if (baseUrl.endsWith("/api/dfs")) return baseUrl;
  if (baseUrl.endsWith("/remote-payment-gateway-1.0")) {
    return `${baseUrl}/api/dfs`;
  }
  return `${baseUrl}${CONTEXT_PATH}`;
};

const formatNagadDate = (date = new Date()) => {
  // Nagad's guide requires Bangladesh local time as yyyyMMddHHmmss.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
};

const configurationValues = (providerConfiguration) => {
  const { merchantId, merchantNumber, merchantPrivateKey, nagadPublicKey } =
    providerConfiguration?.credentials || {};
  const { baseUrl, clientIp, apiVersion = "v-0.2.0" } =
    providerConfiguration?.config || {};
  if (
    [baseUrl, clientIp, merchantId, merchantPrivateKey, nagadPublicKey].some(
      (value) => !String(value || "").trim(),
    )
  ) {
    throw new Error("Nagad merchant configuration is incomplete.");
  }
  return {
    baseUrl: String(baseUrl).replace(/\/$/, ""),
    clientIp: String(clientIp).trim(),
    apiVersion,
    merchantId: String(merchantId).trim(),
    merchantNumber: String(merchantNumber || "").trim(),
    merchantPrivateKey: cleanPem(merchantPrivateKey),
    nagadPublicKey: cleanPem(nagadPublicKey),
  };
};

const nagadHeaders = ({ clientIp, apiVersion }) => ({
  "Content-Type": "application/json",
  "X-KM-IP-V4": clientIp,
  "X-KM-Client-Type": "PC_WEB",
  "X-KM-Api-Version": apiVersion,
});

const encryptSensitiveData = (plainText, nagadPublicKey) =>
  publicEncrypt(
    { key: nagadPublicKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(plainText, "utf8"),
  ).toString("base64");

const signSensitiveData = (plainText, merchantPrivateKey) => {
  const signer = createSign("RSA-SHA1");
  signer.update(plainText, "utf8");
  signer.end();
  return signer.sign(merchantPrivateKey, "base64");
};

const decryptAndVerifyResponse = (data, configuration) => {
  if (!data?.sensitiveData || !data?.signature) {
    throw new Error(data?.message || "Nagad returned an invalid encrypted response.");
  }
  const plainText = privateDecrypt(
    {
      key: configuration.merchantPrivateKey,
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(data.sensitiveData, "base64"),
  ).toString("utf8");
  const verifier = createVerify("RSA-SHA1");
  verifier.update(plainText, "utf8");
  verifier.end();
  if (!verifier.verify(configuration.nagadPublicKey, data.signature, "base64")) {
    throw new Error("Nagad response signature verification failed.");
  }
  return JSON.parse(plainText);
};

const secureRequestBody = (sensitiveData, configuration) => {
  const plainText = jsonText(sensitiveData);
  return {
    sensitiveData: encryptSensitiveData(plainText, configuration.nagadPublicKey),
    signature: signSensitiveData(plainText, configuration.merchantPrivateKey),
  };
};

const parseResponse = async (response, fallback) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.reason) {
    throw new Error(data.message || data.reason || fallback);
  }
  return data;
};

const localNagadOrderId = (paymentId) =>
  `N${String(paymentId).slice(-12)}${Date.now().toString().slice(-6)}`;

export async function createNagadPayment({ payment, providerConfiguration }) {
  const configuration = configurationValues(providerConfiguration);
  const orderId = localNagadOrderId(payment.id);
  const dateTime = formatNagadDate();
  const initializePayload = {
    merchantId: configuration.merchantId,
    // v3.3 uses `datetime` inside encrypted data and `dateTime` in the
    // surrounding request body. The guide's field table capitalizes it
    // differently, but its crypto-operation payload uses this wire name.
    datetime: dateTime,
    orderId,
    challenge: randomBytes(20).toString("hex").toUpperCase(),
  };
  const initializeUrl = new URL(
    `${apiBaseUrl(configuration.baseUrl)}/check-out/initialize/${encodeURIComponent(configuration.merchantId)}/${encodeURIComponent(orderId)}`,
  );
  initializeUrl.searchParams.set("locale", "EN");
  const initializeResponse = await fetch(initializeUrl, {
    method: "POST",
    headers: nagadHeaders(configuration),
    body: JSON.stringify({
      ...(configuration.merchantNumber && {
        accountNumber: configuration.merchantNumber,
      }),
      dateTime,
      ...secureRequestBody(initializePayload, configuration),
    }),
    cache: "no-store",
  });
  const initializedEnvelope = await parseResponse(
    initializeResponse,
    "Nagad payment initialization failed.",
  );
  const initialized = decryptAndVerifyResponse(
    initializedEnvelope,
    configuration,
  );
  if (!initialized.paymentReferenceId) {
    throw new Error("Nagad did not return a payment reference ID.");
  }
  const challenge = initialized.challenge || initialized.random;
  if (!challenge) throw new Error("Nagad did not return the payment challenge.");

  const callbackUrl = new URL(
    "/api/py/nagad/callback",
    process.env.NEXT_PUBLIC_SITE_URL,
  );
  callbackUrl.searchParams.set("paymentId", payment.id);
  const completePayload = {
    merchantId: configuration.merchantId,
    orderId,
    currencyCode: "050",
    amount: Number(payment.amount).toFixed(2),
    challenge,
  };
  const completeResponse = await fetch(
    `${apiBaseUrl(configuration.baseUrl)}/check-out/complete/${encodeURIComponent(initialized.paymentReferenceId)}`,
    {
      method: "POST",
      headers: nagadHeaders(configuration),
      body: JSON.stringify({
        ...secureRequestBody(completePayload, configuration),
        merchantCallbackURL: callbackUrl.toString(),
        additionalMerchantInfo: {
          serviceName: `Order ${payment.order.orderNo}`.slice(0, 25),
          additionalFieldNameEN: "Order",
          additionalFieldNameBN: "Order",
          additionalFieldValue: String(payment.order.orderNo).slice(0, 20),
        },
      }),
      cache: "no-store",
    },
  );
  const completed = await parseResponse(
    completeResponse,
    "Nagad order placement failed.",
  );
  if (!completed.callBackUrl) {
    throw new Error("Nagad did not return its hosted payment URL.");
  }
  return {
    url: completed.callBackUrl,
    transactionId: orderId,
    externalEventId: initialized.paymentReferenceId,
  };
}

export async function verifyNagadPayment(paymentReferenceId, providerConfiguration) {
  if (!paymentReferenceId) throw new Error("Nagad payment reference is missing.");
  const configuration = configurationValues(providerConfiguration);
  const response = await fetch(
    `${apiBaseUrl(configuration.baseUrl)}/verify/payment/${encodeURIComponent(paymentReferenceId)}`,
    {
      method: "GET",
      headers: nagadHeaders(configuration),
      cache: "no-store",
    },
  );
  return parseResponse(response, "Nagad payment verification failed.");
}
