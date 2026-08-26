import { markPaymentCancelled } from "@/backend/serverActions/paymentAction";
import { NextResponse } from "next/server";

async function handleCancel(req) {
  let formData;

  if (req.method === "POST") {
    formData = await req.formData();
  } else {
    formData = new URL(req.url).searchParams;
  }

  const paymentId = formData.get("value_c");
  const orderId = formData.get("value_d");
  const orderNo = formData.get("value_a");
  const phoneNumber = formData.get("value_b");

  await markPaymentCancelled({
    paymentId,
    orderId,
    orderNo,
    gatewayResponse: Object.fromEntries(formData.entries()),
    reason: "Customer cancelled payment.",
  });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/payment/cancel?o=${orderNo}&p=${phoneNumber}`,
  );
}

export async function POST(req) {
  return handleCancel(req);
}

export async function GET(req) {
  return handleCancel(req);
}
