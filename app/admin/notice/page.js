import { getNotice } from "@/backend/serverActions/noticeaction";
import NoticeForm from "./_components/NoticeForm";

export const dynamic = "force-static";


export default async function  OfferPage() {
    const {data}=await getNotice()
    console.log(data)
  return (
        <div className=" p-4">
                <div className=" text-center py-2 font-bold bg-slate-400 dark:bg-slate-800 rounded-lg border-b-4 border-slate-500">Notice!</div>
                <div className="w-full ">
                <NoticeForm data={data}/>
                </div>
              </div>
  )
}
