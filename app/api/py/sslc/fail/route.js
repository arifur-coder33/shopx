import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";

async function handleFail(req) {
  const storeId = await requireCurrentStoreId();
  const siteUrl = new URL(req.url).origin;
  const formData =
    req.method === "POST"
      ? await req.formData()
      : new URL(req.url).searchParams;

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

  // Browser-return parameters alone cannot prove provider failure. Keep the
  // attempt pending so a verified success or a customer retry can settle it.

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
