"use client";

import { getOrderIdByOrderNoPhoneNo } from "@/backend/serverActions/orderActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import SSLCommerzPayButton from "@/components/payments/SSLCommerzPayButton";
import { AlertTriangle, Home, RefreshCcw, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PaymentFailed() {
  const searchParams = useSearchParams();

  const orderNo = searchParams.get("o");
  const phone = searchParams.get("p");

  const [loading, setLoading] = useState(true);
  const [validOrder, setValidOrder] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    if (!orderNo || !phone) {
      setLoading(false);
      return;
    }

    const checkOrder = async () => {
      try {
        const res = await getOrderIdByOrderNoPhoneNo({
          orderNo,
          phoneNumber: phone,
        });

        if (res.success) {
          setValidOrder(true);
          setOrderId(res.data?.id);
        } else {
          setValidOrder(false);
        }
      } finally {
        setLoading(false);
      }
    };

    checkOrder();
  }, [orderNo, phone]);

  const handleRetry = async () => {
    if (!orderId) return;

    const res = await fetch("/api/sslcommerz/initiate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
      }),
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Payment restart failed.");
    }
  };

  if (!orderNo || !phone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-red-600">Invalid Request</h1>
          <p className="text-gray-500 mt-2">Order information was not found.</p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 rounded-xl w-full"
          >
            <Home size={18} />
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl p-6">
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : validOrder ? (
          <>
            <div className="flex justify-center">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-red-600 mt-5">
              Payment Failed
            </h1>

            <p className="text-center text-gray-600 mt-3 leading-relaxed">
              আপনার অনলাইন পেমেন্ট সম্পন্ন হয়নি।
              <br />
              চাইলে আবার পেমেন্ট করতে পারেন।
            </p>

            <div className="bg-gray-100 rounded-xl mt-6 p-4 text-center">
              <p className="text-sm text-gray-500">অর্ডার নম্বর</p>
              <p className="font-bold text-lg break-all">{orderNo}</p>
            </div>

            {/* <button
              onClick={handleRetry}
              className="w-full mt-6 bg-brand hover:opacity-90 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <RefreshCcw size={18} />
              আবার পেমেন্ট করুন
            </button> */}
            <SSLCommerzPayButton orderId={orderId}>
              <RefreshCcw size={18} />
              আবার পেমেন্ট করুন
            </SSLCommerzPayButton>
            <Link
              href={`/tracking?o=${orderNo}&p=${phone}`}
              className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition"
            >
              <ShoppingBag size={18} />
              অর্ডারের বিস্তারিত দেখুন
            </Link>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-center text-red-600 mt-5">
              Invalid Order
            </h1>

            <p className="text-center text-gray-500 mt-3">
              এই অর্ডারটি খুঁজে পাওয়া যায়নি।
            </p>
          </>
        )}

        <Link
          href="/"
          className="w-full mt-5 border border-gray-300 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition"
        >
          <Home size={18} />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
