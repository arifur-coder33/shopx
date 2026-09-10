import { verifyNagadPayment } from "@/backend/lib/payments/providers/nagad";
import {
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentSuccess,
} from "@/backend/serverActions/paymentAction";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const sameAmount = (left, right) =>
  Math.abs(Number(left) - Number(right)) < 0.01;

const resultUrl = (path, siteUrl, order, transactionId) => {
  const url = new URL(path, siteUrl);
  if (transactionId) url.searchParams.set("tran_id", transactionId);
  if (order?.orderNo) url.searchParams.set("o", order.orderNo);
  if (order?.phoneNumber) url.searchParams.set("p", order.phoneNumber);
  return url;
};

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const siteUrl = new URL(request.url).origin;
  const paymentId = params.get("paymentId");
  const paymentReferenceId = params.get("payment_ref_id");
  const providerOrderId = params.get("order_id");
  const payment = paymentId
    ? await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: true, paymentGateway: true },
      })
    : paymentReferenceId
      ? await prisma.payment.findFirst({
          where: { externalEventId: paymentReferenceId },
          include: { order: true, paymentGateway: true },
        })
      : providerOrderId
        ? await prisma.payment.findFirst({
            where: { transactionId: providerOrderId },
            include: { order: true, paymentGateway: true },
          })
        : null;
  if (!payment || payment.paymentGateway?.adapterKey !== "NAGAD") {
    return NextResponse.redirect(resultUrl("/payment/failed", siteUrl), 303);
  }

  try {
    const configuration = getProviderRuntimeConfiguration(
      "gateway",
      payment.paymentGateway,
    );
    if (!configuration.ready) {
      throw new Error("Nagad payment configuration is unavailable.");
    }
    const reference = paymentReferenceId || payment.externalEventId;
    const verified = await verifyNagadPayment(reference, configuration);
    if (
      verified.merchantId !== configuration.credentials.merchantId ||
      verified.orderId !== payment.transactionId ||
      verified.paymentRefId !== payment.externalEventId ||
      !sameAmount(verified.amount, payment.amount)
    ) {
      throw new Error("Nagad verification data does not match the pending payment.");
    }

    const status = String(verified.status || "").toLowerCase();
    if (status === "success") {
      const transactionId =
        verified.issuerPaymentReferenceNo || params.get("issuer_payment_ref");
      await markPaymentSuccess({
        paymentId: payment.id,
        amount: Number(verified.amount),
        transactionId,
        externalEventId: verified.paymentRefId,
        gatewayResponse: verified,
      });
      return NextResponse.redirect(
        resultUrl("/payment/success", siteUrl, payment.order, transactionId),
        303,
      );
    }
    if (["cancelled", "partialcancelled", "aborted"].includes(status)) {
      await markPaymentCancelled({
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNo: payment.order.orderNo,
        gatewayResponse: verified,
        reason: `Nagad payment ${verified.status}.`,
      });
      return NextResponse.redirect(
        resultUrl("/payment/cancel", siteUrl, payment.order),
        303,
      );
    }
    const terminalFailures = [
      "invalidrequest",
      "fraud",
      "unknownfailed",
      "failed",
    ];
    if (terminalFailures.includes(status)) {
      await markPaymentFailed({
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNo: payment.order.orderNo,
        gatewayResponse: verified,
        reason: `Nagad payment ${verified.status || "failed"}.`,
      });
    }
    // OrderInitiated/Ready/InProgress/OtpSent/OtpVerified/PinGiven are transient.
    // Keep those payments pending; a later callback or reconciliation can verify them.
    return NextResponse.redirect(
      resultUrl("/payment/failed", siteUrl, payment.order),
      303,
    );
  } catch (error) {
    // A verification/network error must not change the payment to PAID or FAILED;
    // keeping it pending allows a later verified status check/reconciliation.
    console.error("Nagad callback verification failed:", error?.message || error);
    return NextResponse.redirect(
      resultUrl("/payment/failed", siteUrl, payment.order),
      303,
    );
  }
}
