import Link from "next/link";

export default async function OrderTrackingPage({ params, searchParams }) {
  const { orderNo } = await params;
  const { p, orderSuccess } = await searchParams;
  // const { success, data, error } = await getOrderByOrderNo(orderNo, p);
  // if ((!success && error) || !data) {
  //   return <p>কোন ডাটা পাওয়া যায়নি।</p>;
  // }

  return (
    // <div>
    //   {orderSuccess && (
    //     <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row">
    //       <Heart /> ধন্যবাদ। <Heart /> আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
    //       আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
    //     </h1>
    //   )}

    //   <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
    //     <OrderDeliveryDetails data={data} />
    //     <div className="mx-2 my-2  col-span-full  ">
    //       Status:{" "}
    //       <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
    //     </div>
    //     <OrderItemTable data={data} />
    //   </div>
    // </div>
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="bg-white p-6 rounded-2xl shadow-md text-center max-w-md w-full">
        <h1 className="text-2xl font-bold text-green-600 mb-2">
          🎉 Order Successful
        </h1>

        <p className="text-gray-600 mb-4">
          আপনার অর্ডার সফলভাবে সম্পন্ন হয়েছে।
        </p>

        <div className="bg-gray-100 p-3 rounded mb-4">
          <p className="text-sm text-gray-500">Order NO </p>

          <p className="font-semibold">{orderNo}</p>
        </div>

        <Link
          href="/"
          className="inline-block bg-brand text-white px-5 py-2 rounded-lg"
        >
          Continue Shopping
        </Link>
        <Link
          href={`/tracking/${orderNo}?orderSuccess=true`}
          className="inline-block mt-4 bg-orange-500 text-white px-5 py-2 rounded-lg"
        >
          View Order Details
        </Link>
      </div>
    </div>
  );
}
