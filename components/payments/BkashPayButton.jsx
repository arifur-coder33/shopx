"use client";

import { initiateConfiguredPayment } from "@/backend/serverActions/paymentInitiationAction";
import { useState } from "react";

export default function BkashPayButton({ paymentId }) {
  const [loading, setLoading] = useState(false);
  const handlePayment = async () => {
    setLoading(true);
    const result = await initiateConfiguredPayment(paymentId);
    if (result.success && result.url) window.location.href = result.url;
    else {
      window.alert(result.message || "Payment failed to initiate");
      setLoading(false);
    }
  };
  return <button disabled={loading} type="button" onClick={handlePayment} className="rounded-lg bg-pink-600 px-6 py-3 text-white disabled:opacity-50">{loading ? "Opening bKash…" : "Pay with bKash"}</button>;
}
