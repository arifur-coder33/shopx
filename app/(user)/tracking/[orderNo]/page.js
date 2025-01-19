import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import OrderDeliveryDetails from "@/components/tracking/OrderDeliveryDetails";
import OrderItemTable from "@/components/tracking/OrderItemTable";

import { Heart } from "lucide-react";

export default async function OrderTrackingPage({ params, searchParams }) {
  const { orderNo } = await params;
  const { p, orderSuccess } = await searchParams;
  const { success, data, error } = await getOrderByOrderNo(orderNo, p);
  if ((!success && error) || !data) {
    return <p>কোন ডাটা পাওয়া যায়নি।</p>;
  }

  return (
    <div>
      {orderSuccess && (
        <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row">
          <Heart /> ধন্যবাদ। <Heart /> আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
          আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
        </h1>
      )}

      <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
        <OrderDeliveryDetails data={data} />
        <div className="mx-2 my-2  col-span-full  ">
          Status:{" "}
          <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
        </div>
        <OrderItemTable data={data} />
      </div>
    </div>
  );
}
