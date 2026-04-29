"use server";

export async function initiateSSLcommerzPayment({
  amount,
  name,
  email,
  emi,
  order_id,
  phone,
}) {
  const tran_id = "TXN_" + Date.now();

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
    cus_add1: phone,

    shipping_method: "NO",
    product_name: "Test",
    product_category: "General",
    product_profile: "general",
    emi_option: emi ? 1 : 0,
    emi_allow_only: emi ? 1 : 0,
    value_a: order_id,
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
  console.log("SSLCommerz Response Status:", response);
  return response.GatewayPageURL;
}
