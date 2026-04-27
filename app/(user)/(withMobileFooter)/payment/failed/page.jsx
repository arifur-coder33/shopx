"use client";

export default function PaymentFailed({ searchParams }) {
  const orderId = searchParams.orderId;

  const handleRetry = async () => {
    const res = await fetch("/api/sslcommerz/initiate", {
      method: "POST",
      body: JSON.stringify({
        orderId, // 🔥 existing order
      }),
    });

    const data = await res.json();

    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Payment restart failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50">
      <div className="bg-white p-6 rounded-xl shadow text-center">
        <h1 className="text-2xl font-bold text-red-600">❌ Payment Failed</h1>

        <p className="mt-2 text-gray-600">আপনার পেমেন্ট সম্পন্ন হয়নি।</p>

        <button
          onClick={handleRetry}
          className="mt-4 bg-brand text-white px-5 py-2 rounded-lg"
        >
          🔁 Try Again
        </button>
      </div>
    </div>
  );
}
