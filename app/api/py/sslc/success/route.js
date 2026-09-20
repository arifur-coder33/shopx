import { validateSSLcommerzPayment } from "@/backend/lib/payments/providers/sslcommerz";
import { assertSSLcommerzVerifiedPayment } from "@/backend/lib/payments/providers/sslcommerzValidation.mjs";
import { markPaymentSuccess } from "@/backend/services/paymentStatusService";
import { firePurchaseServer } from "@/backend/serverActions/SocialPurchaseEventAction";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";
async function handleSSL(req) {
  const storeId = await requireCurrentStoreId();
  let formData;
  let resolvedOrder;
  const siteUrl = new URL(req.url).origin;

  if (req.method === "POST") {
    formData = await req.formData();
  } else {
    // GET হলে query থেকে নাও
    const url = new URL(req.url);
    formData = url.searchParams;
  }

  const tran_id = formData.get("tran_id");
  const val_id = formData.get("val_id");
  const callbackOrderNo = formData.get("value_a");
  const callbackOrderId = formData.get("value_d");
  const paymentId = formData.get("value_c");

  if (!val_id || !tran_id) {
    return NextResponse.redirect(
      `${siteUrl}/payment/failed`,
      303,
    );
  }

  try {
    const payment = paymentId
      ? await prisma.payment.findUnique({
          where: { id: paymentId, storeId },
          include: { paymentGateway: true, order: true },
        })
      : tran_id
        ? await prisma.payment.findFirst({
            where: { storeId, transactionId: tran_id },
            include: { paymentGateway: true, order: true },
          })
        : null;
    if (!payment || payment.paymentGateway?.adapterKey !== "SSLCOMMERZ") {
      throw new Error("SSLCommerz payment configuration was not found.");
    }
    if (payment.paymentGateway.storeId !== storeId || payment.order.storeId !== storeId) {
      throw new Error("SSLCommerz payment references another Store.");
    }
    resolvedOrder = payment.order;
    const providerConfiguration = getProviderRuntimeConfiguration(
      "gateway",
      payment.paymentGateway,
    );
    if (
      !providerConfiguration.integrationAvailable ||
      !providerConfiguration.credentialsConfigured
    ) {
      throw new Error("SSLCommerz credentials are unavailable.");
    }
    const data = await validateSSLcommerzPayment(val_id, providerConfiguration);
    assertSSLcommerzVerifiedPayment(data, payment, val_id);
    if (data.tran_id !== tran_id) {
      throw new Error("SSLCommerz transaction ID mismatch.");
    }
    if (
      (paymentId && paymentId !== data.value_c) ||
      (callbackOrderId && callbackOrderId !== data.value_d) ||
      (callbackOrderNo && callbackOrderNo !== data.value_a) ||
      (formData.get("amount") && Number(formData.get("amount")) !== Number(data.amount)) ||
      (formData.get("currency") && formData.get("currency") !== data.currency) ||
      (formData.get("status") && !["VALID", "VALIDATED"].includes(formData.get("status")))
    ) throw new Error("SSLCommerz callback conflicts with verified transaction.");
    await markPaymentSuccess({
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      paymentId: payment.id,
      amount: Number(data?.amount),
      storeAmount: Number(data.store_amount),
      transactionId: data.tran_id,
      bankTransactionId: data.bank_tran_id,
      cardType: data?.card_type,
      cardNo: data?.card_no,
      gatewayResponse: data,
      externalEventId: `${data.val_id || val_id}:${data.tran_id}`,
    });

    firePurchaseServer({ orderNo: payment.order.orderNo }).catch(() => undefined);
    const successUrl = new URL(
      "/payment/success",
      siteUrl,
    );
    if (tran_id) successUrl.searchParams.set("tran_id", tran_id);
    successUrl.searchParams.set("o", payment.order.orderNo);
    successUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(successUrl, 303);
  } catch (error) {
    console.error("SSLCommerz success callback failed:", error?.message || error);
    const failedUrl = new URL(
      "/payment/failed",
      siteUrl,
    );
    const orderNo = resolvedOrder?.orderNo || callbackOrderNo;
    const phoneNumber = resolvedOrder?.phoneNumber;
    if (orderNo) failedUrl.searchParams.set("o", orderNo);
    if (phoneNumber) failedUrl.searchParams.set("p", phoneNumber);
    if (callbackOrderId) failedUrl.searchParams.set("id", callbackOrderId);
    return NextResponse.redirect(failedUrl, 303);
  }
}

// 🔥 both methods handle
export async function POST(req) {
  return handleSSL(req);
}

export async function GET(req) {
  return handleSSL(req);
}
