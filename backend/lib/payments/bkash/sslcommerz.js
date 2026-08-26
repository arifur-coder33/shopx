"use server";

import { getOrderIdByOrderNoPhoneNo } from "@/backend/serverActions/orderActions";
import { createPayment } from "@/backend/serverActions/paymentAction";

export async function initiateSSLcommerzPayment({
  amount,
  name,
  email,
  emiAllow,
  onlyEmi,
  orderNo,
  phoneNumber,
}) {
  const tran_id = "TXN_" + Date.now();

  const order = await getOrderIdByOrderNoPhoneNo({ orderNo, phoneNumber });
  console.log("order", order);

  const payment = await createPayment({
    orderId: order?.data?.id,
    gateway: "SSLCOMMERZ",
    paymentMethod: "ONLINE",
    amount: amount,
  });
  const data = {
    store_id: process.env.SSLCZ_STORE_ID,
    store_passwd: process.env.SSLCZ_STORE_PASSWD,
    total_amount: Number(amount),
    currency: "BDT",
    tran_id,

    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/py/sslc/success`,
    fail_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/py/sslc/fail`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/py/sslc/cancel`,

    cus_name: name,
    cus_email: email,
    cus_add1: phoneNumber,

    shipping_method: "NO",
    product_name: "Test",
    product_category: "General",
    product_profile: "general",
    emi_option: emiAllow ? 1 : 0,
    emi_allow_only: onlyEmi ? 1 : 0,
    value_b: phoneNumber,
    value_a: orderNo,
    value_c: payment.id,
    value_d: order.data.id,
  };
  const res = await fetch(
    "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data),
    },
  );

  const response = await res.json();

  return response.GatewayPageURL;
}
