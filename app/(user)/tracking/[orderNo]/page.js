// import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
// import OrderDeliveryDetails from "@/components/tracking/OrderDeliveryDetails";
// import OrderItemTable from "@/components/tracking/OrderItemTable";

// import { Heart } from "lucide-react";

// export default async function OrderTrackingPage({ params, searchParams }) {
//   const { orderNo } = await params;
//   const { p, orderSuccess } = await searchParams;
//   const { success, data, error } = await getOrderByOrderNo(orderNo, p);
//   if ((!success && error) || !data) {
//     return <p>কোন ডাটা পাওয়া যায়নি।</p>;
//   }

//   return (
//     <div>
//       {orderSuccess && (
//         <di className>
//           <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row">
//             <Heart /> ধন্যবাদ। <Heart /> আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
//             আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
//           </h1>
//           <p>
//             অথবা বিশেষ প্রয়োজনে আপনি আমাদের হেল্পলাইন নাম্বারে কল করতে পারেন।
//             হেল্পলাইন নাম্বার:
//             <a href="tel:+8801915109059">01915-109059</a>
//           </p>
//           <p>অর্ডারটি ট্রাকিং করতে এই লিংক ফলো করুন </p>
//         </di>
//       )}

//       <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
//         <OrderDeliveryDetails data={data} />
//         <div className="mx-2 my-2  col-span-full  ">
//           Status:{" "}
//           <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
//         </div>
//         <OrderItemTable data={data} />
//       </div>
//     </div>
//   );
// }

// app/tracking/[orderNo]/page.jsx
import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import CopyLinkButton from "@/components/common/CopyLinkButton";

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

  const trackingLink = `https://www.bdmart24.online/tracking/${
    data?.orderNo
  }?p=${encodeURIComponent(data?.phoneNumber)}`;

  return (
    <div>
      {orderSuccess && (
        <div>
          <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row items-center gap-1">
            <Heart /> ধন্যবাদ। <Heart /> আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
            আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
          </h1>
        </div>
      )}

      <div className="my-3">
        <p>
          অথবা বিশেষ প্রয়োজনে আপনি আমাদের হেল্পলাইন নাম্বারে কল করতে পারেন।
          হেল্পলাইন নাম্বার:{" "}
          <a
            href="tel:+8801915109059"
            className="text-blue-600 hover:underline"
          >
            01915-109059
          </a>
        </p>

        <p className="mt-2">
          অর্ডারটি ট্র্যাক করতে এই লিংক ফলো করুন:{" "}
          <a
            href={trackingLink}
            className="text-blue-600 hover:underline"
            target="_blank"
          >
            Tracking
          </a>{" "}
          <CopyLinkButton link={trackingLink} />
        </p>
      </div>

      <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
        <OrderDeliveryDetails data={data} />
        <div className="mx-2 my-2 col-span-full">
          Status:{" "}
          <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
        </div>
        <OrderItemTable data={data} />
      </div>
    </div>
  );
}
