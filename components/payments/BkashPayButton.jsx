"use client";

import { createBkashPayment } from "@/backend/lib/payments/bkash/bkashPayments";

export default function BkashPayButton({ amount, orderId }) {
  const handlePayment = async () => {
    const data = await createBkashPayment(amount, orderId);
    console.log("Bkash Payment Response:", data);
    if (data.bkashURL) {
      window.location.href = data.bkashURL; // redirect to bKash
    } else {
      alert("Payment failed to initiate");
    }
  };

  return (
    <button
      type="button"
      onClick={handlePayment}
      className="bg-pink-600 text-white px-6 py-3 rounded-lg"
    >
      Pay with bKash
    </button>
  );
}
