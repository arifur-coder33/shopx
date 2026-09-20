import { executeBkashPayment } from "@/backend/lib/payments/providers/bkash";
import { assertBkashExecutedPayment } from "@/backend/lib/payments/providers/bkashValidation.mjs";
import {
  markPaymentSuccess,
} from "@/backend/services/paymentStatusService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

export async function GET(request) {
  const storeId = await requireCurrentStoreId();
  const params = new URL(request.url).searchParams;
  const paymentID = params.get("paymentID");
  const status = params.get("status");
  const siteUrl = new URL(request.url).origin;
  const payment = paymentID
    ? await prisma.payment.findFirst({
        where: { storeId, OR: [
          { externalEventId: paymentID },
          // Older successful records stored "paymentID:trxID".
          { externalEventId: { startsWith: `${paymentID}:` } },
        ] },
        include: { order: true, paymentGateway: true },
      })
    : null;
  if (!payment) return NextResponse.redirect(`${siteUrl}/payment/failed`, 303);
  if (payment.status === "PAID") {
    const successUrl = new URL("/payment/success", siteUrl);
    successUrl.searchParams.set("o", payment.order.orderNo);
    successUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(successUrl, 303);
  }
  if (status === "cancel") {
    // Browser return status is not provider-confirmed payment state.
    const cancelUrl = new URL("/payment/cancel", siteUrl);
    cancelUrl.searchParams.set("o", payment.order.orderNo);
    cancelUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(cancelUrl, 303);
  }
  if (status !== "success") {
    // Leave the attempt pending for a verified success or explicit retry.
    const failedUrl = new URL("/payment/failed", siteUrl);
    failedUrl.searchParams.set("o", payment.order.orderNo);
    failedUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(failedUrl, 303);
  }
  try {
    if (payment.paymentGateway?.adapterKey !== "BKASH") {
      throw new Error("bKash payment configuration was not found.");
    }
    if (payment.order.storeId !== storeId || payment.paymentGateway.storeId !== storeId) {
      throw new Error("bKash payment references another Store.");
    }
    const providerConfiguration = getProviderRuntimeConfiguration(
      "gateway",
      payment.paymentGateway,
    );
    if (
      !providerConfiguration.integrationAvailable ||
      !providerConfiguration.credentialsConfigured
    ) {
      throw new Error("bKash credentials are unavailable.");
    }
    const executed = await executeBkashPayment(
      paymentID,
      providerConfiguration,
    );
    assertBkashExecutedPayment(executed, payment, paymentID);
    await markPaymentSuccess({
      paymentId: payment.id,
      amount: Number(executed.amount),
      transactionId: executed.trxID,
      // Keep paymentID as the callback lookup key for safe repeat delivery.
      externalEventId: paymentID,
      gatewayResponse: executed,
    });
    const successUrl = new URL("/payment/success", siteUrl);
    successUrl.searchParams.set("tran_id", executed.trxID);
    successUrl.searchParams.set("o", payment.order.orderNo);
    successUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(successUrl, 303);
  } catch (error) {
    console.error("bKash callback failed:", error?.message || error);
    const failedUrl = new URL("/payment/failed", siteUrl);
    failedUrl.searchParams.set("o", payment.order.orderNo);
    failedUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(failedUrl, 303);
  }
}
