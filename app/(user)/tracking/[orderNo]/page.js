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
// import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
// import CopyLinkButton from "@/components/common/CopyLinkButton";

// import OrderDeliveryDetails from "@/components/tracking/OrderDeliveryDetails";
// import OrderItemTable from "@/components/tracking/OrderItemTable";
// import { dateConvertToLocalString } from "@/utils/dateConvert";
// import { Heart } from "lucide-react";

// export default async function OrderTrackingPage({ params, searchParams }) {
//   const { orderNo } = await params;
//   const { p, orderSuccess } = await searchParams;

//   const { success, data, error } = await getOrderByOrderNo(orderNo, p);
//   if ((!success && error) || !data) {
//     return <p>কোন ডাটা পাওয়া যায়নি।</p>;
//   }

//   const trackingLink = `https://www.bdmart24.online/tracking/${
//     data?.orderNo
//   }?p=${encodeURIComponent(data?.phoneNumber)}`;

//   return (
//     <div>
//       {orderSuccess && (
//         <div>
//           <h1 className="bg-green-300 p-2 rounded-md dark:text-slate-800 flex flex-row items-center gap-1">
//             <Heart /> ধন্যবাদ। <Heart /> আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
//             আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
//           </h1>
//         </div>
//       )}

//       <div className="my-3">
//         <p>
//           বিশেষ প্রয়োজনে আপনি আমাদের হেল্পলাইন নাম্বারে কল করতে পারেন। হেল্পলাইন
//           নাম্বার:{" "}
//           <a
//             href="tel:+8801915109159"
//             className="text-blue-600 hover:underline"
//           >
//             01915-109159
//           </a>
//         </p>

//         <p className="mt-2">
//           অর্ডারটি ট্র্যাক করতে এই লিংক ফলো করুন:{" "}
//           <a
//             href={trackingLink}
//             className="text-blue-600 hover:underline"
//             target="_blank"
//           >
//             Tracking
//           </a>{" "}
//           <CopyLinkButton link={trackingLink} />
//         </p>
//       </div>

//       <div className="grid sm:grid-cols-2 px-4 border mt-2 rounded-2xl">
//         <OrderDeliveryDetails data={data} />
//         <div className="mx-2 my-2 col-span-full">
//           Status:{" "}
//           <span className="bg-orange-500 p-2 rounded-2xl">{data?.status}</span>
//         </div>
//         <div className="mx-2 my-2 col-span-full">
//           Status Last updated:{" "}
//           <span className="p-2 rounded-2xl">
//             {dateConvertToLocalString(data?.updatedAt)}
//           </span>
//         </div>
//         <OrderItemTable data={data} />
//       </div>
//     </div>
//   );
// }
import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import WhatsAppChat from "@/components/common/Chat/WhatsAppChat";
import CopyLinkButton from "@/components/common/CopyLinkButton";
import OrderDeliveryDetails from "@/components/tracking/OrderDeliveryDetails";
import OrderItemTable from "@/components/tracking/OrderItemTable";
import { dateConvertToLocalString } from "@/utils/dateConvert";
import { MessageCircle } from "lucide-react";

export default async function OrderTrackingPage({ params, searchParams }) {
  const { orderNo } = await params;

  const { p, orderSuccess } = await searchParams;
  const { success, data, error } = await getOrderByOrderNo(orderNo, p);
  if ((!success && error) || !data) {
    return <p>কোন ডাটা পাওয়া যায়নি।</p>;
  }

  const trackingLink = `${process.env.NEXT_PUBLIC_SITE_URL}/tracking/${
    data?.orderNo
  }?p=${encodeURIComponent(data?.phoneNumber)}`;

  // ✅ Prepare product names and total price
  const productNames =
    data?.orderItems?.map((item) => item.productName).join(", ") ||
    "নির্ধারিত হয়নি";
  const totalPrice = data?.orderPrice
    ? `${data.orderPrice} BDT`
    : "নির্ধারিত হয়নি";

  // ✅ WhatsApp pre-filled message
  const whatsappMessage = encodeURIComponent(
    `হ্যালো, অর্ডার ট্র্যাক করুন।\n` +
      `অর্ডার নাম্বার: ${data?.orderNo}\n` +
      `প্রোডাক্ট: ${productNames}\n` +
      `মোট দাম: ${totalPrice}\n` +
      `ট্র্যাকিং লিঙ্ক: ${trackingLink}`
  );

  const whatsappNumber = "8801915109159";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div>
      {orderSuccess && (
        <div className="">
          <p className="bg-green-300 p-2 rounded-md dark:text-slate-800 ">
             ধন্যবাদ!! আমরা আপনার অর্ডারটি পেয়েছি। খুব দ্রুত
            আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবে।
          </p>
        </div>
      )}

      <div className="my-3 space-y-2 ">
        <p >
          বিশেষ প্রয়োজনে আপনি আমাদের হেল্পলাইন নাম্বারে কল করতে পারেন। হেল্পলাইন
          নাম্বার:{" "}
          <a
            href="tel:+8801915109159"
            className="text-blue-600 hover:underline"
          >
            01915-109159
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 transition"
          >
            <MessageCircle className="w-5 h-5" />
            
          </a>
          <WhatsAppChat Message={whatsappMessage} label={"WhatsApp এ চ্যাট করুন"}/>
        </p>

        <p>
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
        <div className="mx-2 my-2 col-span-full">
          Status Last updated:{" "}
          <span className="p-2 rounded-2xl">
            {dateConvertToLocalString(data?.updatedAt)}
          </span>
        </div>
        <OrderItemTable data={data} />
      </div>
    </div>
  );
}
