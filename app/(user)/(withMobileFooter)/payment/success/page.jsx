import { getOrderIdByOrderNoPhoneNo } from "@/backend/serverActions/orderActions";
import { CheckCircle2, Home, PackageCheck } from "lucide-react";
import Link from "next/link";

export default async function PaymentSuccess({ searchParams }) {
  const { o, p } = await searchParams;

  if (!o || !p) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600">Invalid Request</h1>

          <p className="text-gray-500 mt-3">Order information was not found.</p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 rounded-xl w-full"
          >
            <Home size={18} />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  const checkData = await getOrderIdByOrderNoPhoneNo({
    orderNo: o,
    phoneNumber: p,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-7">
        {checkData.success ? (
          <>
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-4">
                <CheckCircle2 className="w-14 h-14 text-green-600" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-green-600 mt-5">
              Payment Successful
            </h1>

            <p className="text-center text-gray-600 mt-3 leading-7">
              🎉 আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।
              <br />
              অর্ডারটি এখন প্রসেস করা হচ্ছে।
            </p>

            <div className="mt-6 rounded-2xl bg-green-50 border border-green-100 p-4 text-center">
              <p className="text-sm text-gray-500">অর্ডার নম্বর</p>

              <p className="mt-1 text-xl font-bold tracking-wide break-all">
                {o}
              </p>
            </div>

            <Link
              href={`/tracking?o=${o}&p=${p}`}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-medium text-white hover:bg-orange-600 transition"
            >
              <PackageCheck size={20} />
              অর্ডারের বিস্তারিত দেখুন
            </Link>
          </>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Invalid Order</h1>

              <p className="mt-3 text-gray-500">
                এই অর্ডারটি খুঁজে পাওয়া যায়নি।
              </p>
            </div>
          </>
        )}

        <Link
          href="/"
          className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 font-medium text-gray-700 hover:bg-gray-100 transition"
        >
          <Home size={18} />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
