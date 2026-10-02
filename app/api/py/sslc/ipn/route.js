import { validateSSLcommerzPayment } from "@/backend/lib/payments/providers/sslcommerz";
import {
  markPaymentCancelled,
  markPaymentFailed,
  markPaymentSuccess,
} from "@/backend/serverActions/paymentAction";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const validationId = formData.get("val_id");
    const incomingTransactionId = formData.get("tran_id");
    const paymentId = formData.get("value_c");

    if (!validationId || !incomingTransactionId) {
      return NextResponse.json({ success: false, message: "Missing payment reference." }, { status: 400 });
    }

    const payment = paymentId
      ? await prisma.payment.findUnique({
          where: { id: paymentId },
          include: { paymentGateway: true, order: true },
        })
      : await prisma.payment.findFirst({
          where: { transactionId: incomingTransactionId },
          include: { paymentGateway: true, order: true },
        });

    if (!payment || payment.paymentGateway?.adapterKey !== "SSLCOMMERZ") {
      return NextResponse.json({ success: false, message: "Payment record not found." }, { status: 404 });
    }

    const providerConfiguration = getProviderRuntimeConfiguration("gateway", payment.paymentGateway);
    if (!providerConfiguration.integrationAvailable || !providerConfiguration.credentialsConfigured) {
      throw new Error("SSLCommerz credentials are unavailable.");
    }

    const verified = await validateSSLcommerzPayment(validationId, providerConfiguration);
    if (
      verified.tran_id !== incomingTransactionId ||
      (payment.transactionId && payment.transactionId !== verified.tran_id)
    ) {
      throw new Error("SSLCommerz transaction ID mismatch.");
    }

    if (["FAILED", "CANCEL", "CANCELLED"].includes(verified.status)) {
      const update = verified.status === "FAILED" ? markPaymentFailed : markPaymentCancelled;
      await update({
        paymentId: payment.id,
        orderId: payment.orderId,
        orderNo: payment.order.orderNo,
        gatewayResponse: verified,
        reason: `SSLCommerz reported ${verified.status.toLowerCase()}.`,
      });
      return NextResponse.json({ success: true });
    }

    await markPaymentSuccess({
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      paymentId: payment.id,
      amount: Number(verified.amount),
      storeAmount: Number(verified.store_amount),
      transactionId: verified.tran_id,
      bankTransactionId: verified.bank_tran_id,
      cardType: verified.card_type,
      cardNo: verified.card_no,
      gatewayResponse: verified,
      externalEventId: `${verified.val_id || validationId}:${verified.tran_id}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("SSLCommerz IPN processing failed:", error?.message || error);
    // A non-2xx response lets the provider retry notifications that could not
    // be validated or posted because of a transient database/API failure.
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
