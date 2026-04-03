import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import { MessageCircleMore, PhoneCall } from "lucide-react";

export default async function Footer() {
  const { data } = await getSiteSetting();
  return (
    <>
      <div className=" pb-20 text-slate-200 hover:text-slate-100  w-full bg-gradient-to-br from-[rgba(15,23,42,0.85)] via-[rgba(0,0,0,0.85)] to-[rgba(15,23,42,0.85)] shadow-sm shadow-slate-200 p-2">
        <div className="mx-auto flex flex-row justify-between items-center max-w-7xl">
          <div className={` text-[14px]`}>
            <h1 className="text-xl mx-3">যোগাযোগঃ </h1>
            <p className="flex flex-row">
              <span className="mx-2">
                <PhoneCall />
              </span>
              Mobile no: {data?.phoneNumber1}
            </p>
            <p className="flex flex-row">
              <span className="mx-2">
                <MessageCircleMore />
              </span>
              Whatsapp : {data?.phoneNumber1}
            </p>
          </div>
          <div className="flex flex-row justify-end gap-1 items-center"></div>
        </div>
        <div className="flex flex-row  gap-1 items-center justify-center text-[12px]">
          © কপিরাইট-বিডিমার্ট24.অনলাইন -২০২৫
        </div>
      </div>
    </>
  );
}
