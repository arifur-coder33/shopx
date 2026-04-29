import { NextResponse } from "next/server";

async function handleSSL(req) {
  let formData;
  console.log("SSLCommerz Callback Received:", process.env.NEXT_PUBLIC_SITE_UR);
  if (req.method === "POST") {
    formData = await req.formData();
  } else {
    // GET হলে query থেকে নাও
    const url = new URL(req.url);
    formData = url.searchParams;
  }

  const tran_id = formData.get("tran_id");
  const val_id = formData.get("val_id");
  const order_id = formData.get("value_a");

  console.log("SSL Data:", { tran_id, val_id });

  if (!val_id) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/payment/failed`,
    );
  }

  const validationURL = `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${process.env.SSLCZ_STORE_ID}&store_passwd=${process.env.SSLCZ_STORE_PASSWD}&format=json`;

  const res = await fetch(validationURL);
  const data = await res.json();

  if (data.status === "VALID") {
    // ✅ DB update

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/payment/success?tran_id=${tran_id}&&order_id=${order_id}`,
    );
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SITE_URL}payment/failed${order_id}`,
  );
}

// 🔥 both methods handle
export async function POST(req) {
  return handleSSL(req);
}

export async function GET(req) {
  return handleSSL(req);
}
