import { executeBkashPayment } from "@/backend/lib/payments/providers/bkash";
import {
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentSuccess,
} from "@/backend/serverActions/paymentAction";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const paymentID = params.get("paymentID");
  const status = params.get("status");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const payment = paymentID
    ? await prisma.payment.findFirst({
        where: { externalEventId: paymentID },
        include: { order: true, paymentGateway: true },
      })
    : null;
  if (!payment) return NextResponse.redirect(`${siteUrl}/payment/failed`, 303);
  if (status === "cancel") {
    await markPaymentCancelled({
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      reason: "Customer cancelled bKash payment.",
    });
    const cancelUrl = new URL("/payment/cancel", siteUrl);
    cancelUrl.searchParams.set("o", payment.order.orderNo);
    cancelUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(cancelUrl, 303);
  }
  if (status !== "success") {
    await markPaymentFailed({
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      reason: "bKash payment failed.",
    });
    const failedUrl = new URL("/payment/failed", siteUrl);
    failedUrl.searchParams.set("o", payment.order.orderNo);
    failedUrl.searchParams.set("p", payment.order.phoneNumber);
    return NextResponse.redirect(failedUrl, 303);
  }
  try {
    if (payment.paymentGateway?.adapterKey !== "BKASH") {
      throw new Error("bKash payment configuration was not found.");
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
    await markPaymentSuccess({
      paymentId: payment.id,
      amount: Number(executed.amount),
      transactionId: executed.trxID,
      externalEventId: `${paymentID}:${executed.trxID}`,
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
