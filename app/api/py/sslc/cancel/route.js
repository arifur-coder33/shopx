import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

async function handleCancel(req) {
  const storeId = await requireCurrentStoreId();
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
        where: { id: paymentId, storeId },
        include: { order: true },
      })
    : transactionId
      ? await prisma.payment.findFirst({
          where: { storeId, transactionId },
          include: { order: true },
        })
      : null;

  // A customer-facing cancel redirect is not verified provider settlement.
  // Do not let forged return parameters block a later validated success.

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
