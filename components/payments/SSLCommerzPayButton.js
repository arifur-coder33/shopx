"use client";

import { initiateSSLcommerzPayment } from "@/backend/lib/payments/bkash/sslcommerz";
import { getSingleData } from "@/backend/utils/getSingleData";
import { useState } from "react";
import LoadingSpinner from "../common/LoadingSpinner";

export default function SSLCommerzPayButton({ orderId, children }) {
  const [loadingStep, setLoadingStep] = useState(null); // "creating", "success", "redirecting"

  const handlePay = async () => {
    setLoadingStep("redirecting");
    const data = await getSingleData({
      model: "order",
      id: orderId,
      tableProperties: [
        { field: "orderNo" },
        { field: "customerName" },
        { field: "phoneNumber" },
        { field: "email" },
        { field: "dueAmount" },
      ],
    });
    if (data.success && data.data) {
      if (!data.data?.dueAmount || data.data?.dueAmount <= 0) {
        alert("Due amount is zero or invalid. Cannot proceed to payment.");
        setLoadingStep(null);
        return;
      }
      initiateSSLcommerzPayment({
        amount: data?.data?.dueAmount,
        name: data?.data?.customerName,
        email: data?.data?.email,
        orderNo: data?.data?.orderNo,
        phoneNumber: data?.data?.phoneNumber,
        // emiAllow: paymentMethod === "EMI",
        // onlyEmi: paymentMethod === "EMI",
      }).then((url) => {
        if (url) {
          window.location.href = url;
          setLoadingStep(null);
        }
      });
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handlePay();
        }}
        onClick={handlePay}
        className="w-full  mt-6 bg-brand hover:opacity-90 cursor-pointer text-white py-3 rounded-xl flex items-center justify-center gap-2 transition"
      >
        {children || " Pay Now"}
      </button>
      {loadingStep && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black/70 z-30 flex items-center justify-center">
          <LoadingSpinner
            status={
              loadingStep === "creating"
                ? "loading"
                : loadingStep === "success"
                  ? "success"
                  : "redirecting"
            }
            message={
              loadingStep === "creating"
                ? "আপনার অর্ডার নিশ্চিত করা হচ্ছে..."
                : loadingStep === "success"
                  ? "অর্ডার সফলভাবে নিশ্চিত হয়েছে।"
                  : "নিরাপদ পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে..."
            }
          />
        </div>
      )}
    </>
  );
}
