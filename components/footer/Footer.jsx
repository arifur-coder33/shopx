// import Link from "next/link";
// import Logo from "@/components/common/Logo";
// import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
// import { MessageCircleMore, PhoneCall } from "lucide-react";
// import { MessageCircle } from "lucide";

// export default async function Footer() {
//   const {data}= await getSiteSetting()
//   return (
//     <>
//       <div className=" sticky top-0 z-40 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 p-2">
//         <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
//           <div className={` text-[14px]`}>
//            <h1 className="text-xl mx-3">যোগাযোগঃ </h1>
//           <p className="flex flex-row" ><span className="mx-2"><PhoneCall /></span>Mobile no:   {data?.phoneNumber1}</p>
//           <p className="flex flex-row" ><span className="mx-2"><MessageCircleMore /></span>Whatsapp :   {data?.phoneNumber1}</p>

//           </div>
//           <div className="flex flex-row justify-end gap-1 items-center">

//           </div>
//         </div>
//         <div className="flex flex-row  gap-1 items-center justify-center text-[12px]">
//           © কপিরাইট-বিডিমার্ট24.অনলাইন -২০২৫
//           </div>
//       </div>
//     </>
//   );
// }

"use client";

import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import { MessageCircle, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";

export default function Footer() {
  const [siteData, setSiteData] = useState(null);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    // Get current URL
    setCurrentUrl(window.location.href);

    // Fetch site setting
    async function fetchData() {
      const { data } = await getSiteSetting();
      setSiteData(data);
    }
    fetchData();
  }, []);

  if (!siteData) return null; // Loading state

  const phoneNumber = siteData.phoneNumber1 || "01915-109159";
  const whatsappMessage = encodeURIComponent(
    `হ্যালো, আমি আপনার সাথে যোগাযোগ করতে চাই।\nলিঙ্ক: ${currentUrl}`
  );
  const whatsappLink = `https://wa.me/88${phoneNumber}?text=${whatsappMessage}`;

  return (
    <footer className="bg-gradient-to-br from-slate-800 via-black to-slate-800 text-slate-200 shadow-md p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">যোগাযোগ</h1>

          <a
            href={`tel:+88${phoneNumber}`}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition"
          >
            <PhoneCall />
            ফোন করুন: {phoneNumber}
          </a>

          <a
            href={whatsappLink}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 rounded-md transition"
          >
            <MessageCircle />
            WhatsApp চ্যাট
          </a>
        </div>

        <div className="text-center sm:text-right text-sm mt-2 sm:mt-0">
          © কপিরাইট-বিডিমার্ট24.অনলাইন - ২০২৫
        </div>
      </div>
    </footer>
  );
}
