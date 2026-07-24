import Link from "next/link";

export default async function PaymentSuccess({ searchParams }) {
  const params = await searchParams;

  const { o, p, orderNo } = params;

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-6 rounded-2xl shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-2">
          🎉 Payment Successful
        </h1>

        <p className="text-gray-600 mb-4">
          আপনার পেমেন্ট সফলভাবে সম্পন্ন হয়েছে।
        </p>

        <div className="bg-gray-100 p-3 rounded mb-4">
          <p className="font-semibold">অর্ডার নংঃ {o}</p>
        </div>
        <Link
          href={`/tracking/?o=${o}&p=${p}`}
          className="inline-block mt-4 bg-orange-500 text-white px-5 py-2 rounded-lg"
        >
          View Order Details
        </Link>

        <Link
          href="/"
          className="inline-block bg-brand text-white px-5 py-2 rounded-lg mt-5"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
