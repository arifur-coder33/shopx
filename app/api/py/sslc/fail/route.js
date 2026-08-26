import { markPaymentFailed } from "@/backend/serverActions/paymentAction";
import { NextResponse } from "next/server";

export async function POST(req) {
  const formData = await req.formData();

  const paymentId = formData.get("value_c");
  const orderId = formData.get("value_d");
  const orderNo = formData.get("value_a");
  const phoneNumber = formData.get("value_b");

  await markPaymentFailed({
    paymentId,
    orderId,
    orderNo,
    gatewayResponse: Object.fromEntries(formData),
    reason: "SSLCommerz payment failed",
  });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed?o=${orderNo}&p=${phoneNumber}&id=${orderId}`,
  );
}
