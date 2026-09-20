"use server";

import { getSiteUrl } from "@/lib/siteUrl";
import { getDeploymentMode } from "@/backend/services/deploymentModeService";
import { getCurrentStoreContext } from "@/backend/services/storeContextService";
import { normalizeHostname } from "@/backend/utils/hostname";
import { headers } from "next/headers";

/**
 * SSLCommerz hosted payment adapter.
 * Client credentials are supplied by the encrypted provider configuration;
 * SSLCommerz live/sandbox endpoints are shared server constants.
 */

const sslBaseUrl = (configuration) =>
  String(configuration?.config?.isLive) === "true"
    ? "https://securepay.sslcommerz.com"
    : "https://sandbox.sslcommerz.com";

export async function initiateSSLcommerzPayment({
  payment,
  customer = {},
  providerConfiguration,
}) {
  const { storeId, storePassword } = providerConfiguration?.credentials || {};
  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials are not configured on the server.");
  }
  const transactionId = `TXN_${payment.id}_${Date.now()}`;
  let siteUrl = getSiteUrl();
  if (getDeploymentMode() === "SAAS") {
    const context = await getCurrentStoreContext();
    const requestHost = (await headers()).get("host");
    const hostname = normalizeHostname(requestHost);
    if (context.type !== "STORE" || context.store.id !== payment.storeId || !hostname) {
      throw new Error("A verified Store hostname is required for SSLCommerz callbacks.");
    }
    const isLocal = hostname === "localhost" || hostname.endsWith(".localhost");
    const localPort = isLocal ? new URL(`http://${requestHost}`).port : "";
    siteUrl = `${isLocal ? "http" : "https"}://${hostname}${localPort ? `:${localPort}` : ""}`;
  }
  const data = {
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: Number(payment.amount),
    currency: "BDT",
    tran_id: transactionId,
    success_url: `${siteUrl}/api/py/sslc/success`,
    fail_url: `${siteUrl}/api/py/sslc/fail`,
    cancel_url: `${siteUrl}/api/py/sslc/cancel`,
    cus_name: customer.name || payment.order.customerName,
    cus_email: customer.email || payment.order.email || "customer@example.com",
    cus_add1: payment.order.deliveryAddress,
    cus_phone: payment.order.phoneNumber,
    shipping_method: "NO",
    product_name: `Order ${payment.order.orderNo}`,
    product_category: "General",
    product_profile: "general",
    // These values let callbacks resolve the local records without exposing secrets.
    value_a: payment.order.orderNo,
    value_b: payment.order.phoneNumber,
    value_c: payment.id,
    value_d: payment.order.id,
  };
  if (payment.paymentMethod === "EMI") {
    // SSLCommerz renders its own eligible issuer/card and tenure chooser.
    // `emi_allow_only` keeps this session inside the hosted EMI card flow.
    data.emi_option = "1";
    data.emi_max_inst_option = "9";
    data.emi_allow_only = "1";
  }
  const response = await fetch(`${sslBaseUrl(providerConfiguration)}/gwprocess/v4/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.GatewayPageURL) {
    throw new Error(result.failedreason || "SSLCommerz payment initiation failed.");
  }
  return { url: result.GatewayPageURL, transactionId };
}

export async function validateSSLcommerzPayment(validationId, providerConfiguration) {
  if (!validationId) throw new Error("SSLCommerz validation ID is missing.");
  const { storeId, storePassword } = providerConfiguration?.credentials || {};
  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials are not configured on the server.");
  }
  const url = new URL(`${sslBaseUrl(providerConfiguration)}/validator/api/validationserverAPI.php`);
  url.searchParams.set("val_id", validationId);
  url.searchParams.set("store_id", storeId);
  url.searchParams.set("store_passwd", storePassword);
  url.searchParams.set("format", "json");
  const response = await fetch(url, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok || !["VALID", "VALIDATED"].includes(result.status)) {
    throw new Error("SSLCommerz payment verification failed.");
  }
  return result;
}
