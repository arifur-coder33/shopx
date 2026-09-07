"use client";

import { initiateOrderPayment } from "@/backend/serverActions/paymentInitiationAction";
import { useState } from "react";
import { toast } from "react-toastify";
import LoadingSpinner from "../common/LoadingSpinner";

export default function SSLCommerzPayButton({ orderId, children }) {
  const [loading, setLoading] = useState(false);
  const handlePay = async () => {
    setLoading(true);
    try {
      const result = await initiateOrderPayment(orderId);
      if (!result.success || !result.url) throw new Error(result.message || "Payment could not be initiated.");
      window.location.href = result.url;
    } catch (error) {
      toast.error(error.message || "Payment could not be initiated.");
      setLoading(false);
    }
  };
  return (
    <>
      <button type="button" disabled={loading} onClick={handlePay} className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand py-3 text-white transition hover:opacity-90 disabled:opacity-50">
        {children || "Pay online"}
      </button>
      {loading && <div className="fixed left-0 top-0 z-30 flex h-screen w-screen items-center justify-center bg-black/70"><LoadingSpinner status="redirecting" message="নিরাপদ পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে..." /></div>}
    </>
  );
}
