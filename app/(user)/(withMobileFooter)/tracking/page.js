import OrderTimelineNew from "@/app/admin/orders/_components/components/OrderTimeline";
import FloatingInput from "@/components/input/FloatingInput";
import PhoneInput from "@/components/input/PhoneInput";
import Link from "next/link";
import { Suspense } from "react";
import OrderInfo from "./components/OrderInfo";

export default async function OrderTrackingPage({ params, searchParams }) {
  // const { orderNo } = await params;
  const { p, orderSuccess, o, orderId } = await searchParams;
  // const { success, data, error } = await getOrderByOrderNo(orderNo, p);
  // if ((!success && error) || !data) {
  //   return <p>কোন ডাটা পাওয়া যায়নি।</p>;
  // }

  return (
    <div className="min-h-screen flex flex-col items-center ">
      <form
        // action={`/tracking/?p=${p}&orderNo=${orderNo}`}
        method="GET"
        className="card p-6 w-full grid grid-cols-3 gap-2"
      >
        <FloatingInput defaultValue={o} label="অর্ডার নং" name="o" />
        <PhoneInput
          max={11}
          min={11}
          defaultValue={p}
          label="ফোন নং"
          name="p"
          colSpan={4}
          inputType="text"
        />
        <button type="submit" className="bg-brand text-white  rounded-lg">
          Track Order
        </button>
      </form>
      <br></br>
      {orderId ||
        (o && p && (
          <>
            <Suspense fallback={<div>Loading order timeline...</div>}>
              <OrderTimelineNew orderId={orderId} orderNo={o} phoneNumber={p} />
            </Suspense>
            <br></br>
            <Suspense>
              <OrderInfo orderId={orderId} orderNo={o} phoneNumber={p} />
            </Suspense>
          </>
        ))}

      <br></br>

      <Link
        href="/"
        className="inline-block bg-brand text-white px-5 py-2 rounded-lg"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
