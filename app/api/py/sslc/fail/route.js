import { markPaymentFailed } from "@/backend/serverActions/paymentAction";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function handleFail(req) {
  const siteUrl = new URL(req.url).origin;
  const formData =
    req.method === "POST"
      ? await req.formData()
      : new URL(req.url).searchParams;

  const paymentId = formData.get("value_c");
  const transactionId = formData.get("tran_id");
  const payment = paymentId
    ? await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { order: true },
      })
    : transactionId
      ? await prisma.payment.findFirst({
          where: { transactionId },
          include: { order: true },
        })
      : null;

  if (payment) {
    await markPaymentFailed({
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      gatewayResponse: Object.fromEntries(formData.entries()),
      reason: "SSLCommerz payment failed",
    });
  }

  const failedUrl = new URL("/payment/failed", siteUrl);
  const orderNo = payment?.order?.orderNo || formData.get("value_a");
  const phoneNumber = payment?.order?.phoneNumber || formData.get("value_b");
  const orderId = payment?.orderId || formData.get("value_d");
  if (orderNo) failedUrl.searchParams.set("o", orderNo);
  if (phoneNumber) failedUrl.searchParams.set("p", phoneNumber);
  if (orderId) failedUrl.searchParams.set("id", orderId);
  return NextResponse.redirect(failedUrl, 303);
}

export async function POST(req) {
  return handleFail(req);
}

export async function GET(req) {
  return handleFail(req);
}
