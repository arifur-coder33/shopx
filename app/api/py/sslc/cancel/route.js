import { markPaymentCancelled } from "@/backend/serverActions/paymentAction";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function handleCancel(req) {
  let formData;
  const siteUrl = new URL(req.url).origin;

  if (req.method === "POST") {
    formData = await req.formData();
  } else {
    formData = new URL(req.url).searchParams;
  }

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
    await markPaymentCancelled({
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      gatewayResponse: Object.fromEntries(formData.entries()),
      reason: "Customer cancelled payment.",
    });
  }

  const cancelUrl = new URL("/payment/cancel", siteUrl);
  const orderNo = payment?.order?.orderNo || formData.get("value_a");
  const phoneNumber = payment?.order?.phoneNumber || formData.get("value_b");
  if (orderNo) cancelUrl.searchParams.set("o", orderNo);
  if (phoneNumber) cancelUrl.searchParams.set("p", phoneNumber);
  return NextResponse.redirect(cancelUrl, 303);
}

export async function POST(req) {
  return handleCancel(req);
}

export async function GET(req) {
  return handleCancel(req);
}
