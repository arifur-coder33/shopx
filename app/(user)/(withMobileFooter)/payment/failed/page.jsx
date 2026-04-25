import Link from "next/link";

export default function PaymentFailed({ searchParams }) {
  const tran_id = searchParams.tran_id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-6 rounded-2xl shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-2">
          🎉 Payment Failed
        </h1>

        <p className="text-gray-600 mb-4">
          আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।
        </p>

        <div className="bg-gray-100 p-3 rounded mb-4">
          <p className="text-sm text-gray-500">Transaction ID</p>
          <p className="font-semibold">{tran_id}</p>
        </div>

        <Link
          href="/"
          className="inline-block bg-brand text-white px-5 py-2 rounded-lg"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
