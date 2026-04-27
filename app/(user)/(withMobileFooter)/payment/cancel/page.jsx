import { XCircle } from "lucide-react";
import Link from "next/link";

export default function PaymentCancelled({ searchParams }) {
  const tran_id = searchParams.tran_id;

  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg text-center max-w-md w-full">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-red-100 p-3 rounded-full">
            <XCircle className="text-red-600 w-10 h-10" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Payment Cancelled
        </h1>

        {/* Message */}
        <p className="text-gray-600 mb-4">আপনার পেমেন্টটি সম্পন্ন হয়নি</p>

        {/* Transaction ID */}
        {tran_id && (
          <div className="bg-gray-100 p-3 rounded mb-4">
            <p className="text-sm text-gray-500">Transaction ID</p>
            <p className="font-semibold break-all">{tran_id}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/checkout"
            className="bg-brand text-white px-5 py-2 rounded-lg hover:opacity-90"
          >
            Try Again
          </Link>

          <Link
            href="/"
            className="border border-gray-300 px-5 py-2 rounded-lg hover:bg-gray-100"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
