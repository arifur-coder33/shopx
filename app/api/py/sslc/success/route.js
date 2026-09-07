import { validateSSLcommerzPayment } from "@/backend/lib/payments/providers/sslcommerz";
import { markPaymentSuccess } from "@/backend/serverActions/paymentAction";
import { firePurchaseServer } from "@/backend/serverActions/SocialPurchaseEventAction";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
async function handleSSL(req) {
  let formData;
  let resolvedOrder;

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

  if (!val_id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed`,
      303,
    );
  }

  try {
    const payment = paymentId
      ? await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { paymentGateway: true, order: true },
        })
      : tran_id
        ? await prisma.payment.findFirst({
            where: { transactionId: tran_id },
            include: { paymentGateway: true, order: true },
          })
        : null;
    if (!payment || payment.paymentGateway?.adapterKey !== "SSLCOMMERZ") {
      throw new Error("SSLCommerz payment configuration was not found.");
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
    if (tran_id && data.tran_id && data.tran_id !== tran_id) {
      throw new Error("SSLCommerz transaction ID mismatch.");
    }
    if (
      payment.transactionId &&
      data.tran_id &&
      payment.transactionId !== data.tran_id
    ) {
      throw new Error("SSLCommerz transaction does not match the payment.");
    }
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
      process.env.NEXT_PUBLIC_SITE_URL,
    );
    if (tran_id) successUrl.searchParams.set("tran_id", tran_id);
    successUrl.searchParams.set("o", payment.order.orderNo);
    successUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(successUrl, 303);
  } catch (error) {
    console.error("SSLCommerz success callback failed:", error?.message || error);
    const failedUrl = new URL(
      "/payment/failed",
      process.env.NEXT_PUBLIC_SITE_URL,
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
