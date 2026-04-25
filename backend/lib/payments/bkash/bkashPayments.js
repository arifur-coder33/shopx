"use server";

// Step 1: Get Token
export async function getBkashToken() {
  const res = await fetch(
    `${process.env.BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
    },
  );
  const data = await res.json();
  console.log("Bkash Token Response:", data);
  return data.id_token;
}

// Step 2: Create Payment
export async function createBkashPayment(amount, orderId) {
  const token = await getBkashToken();
  console.log("Bkash Token:", token);
  const res = await fetch(
    `${process.env.BKASH_BASE_URL}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: token,
        "x-app-key": process.env.BKASH_APP_KEY,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: "01XXXXXXXXX",
        callbackURL: "https://yourdomain.com/bkash/callback", // still needs API route
        amount: amount,
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: orderId,
      }),
    },
  );

  const data = await res.json();
  return data; // contains bkashURL
}
