"use client";

import { initiateSSLcommerzPayment } from "@/backend/lib/payments/bkash/sslcommerz";

export default function SSLCommerzPayButton() {
  const handlePay = async () => {
    const url = await initiateSSLcommerzPayment({
      amount: 100,
      name: "Arifur",
      email: "test@mail.com",
    });

    window.location.href = url;
  };

  return <button onClick={handlePay}>Pay Now</button>;
}
