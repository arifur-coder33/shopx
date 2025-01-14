import { getBanner } from "@/backend/serverActions/bannerAction";
import HomePageBannerForm from "./_components/HomeBannerForm";

export const dynamic = "force-static";


export default async function BannerPage() {
  const {data}=await getBanner()

  return (
      <div className=" p-4">
            <div className=" text-center py-2 font-bold bg-slate-400 dark:bg-slate-800 rounded-lg border-b-4 border-slate-500">Home Page Banner</div>
            <div className="w-full ">
            <HomePageBannerForm data={data}/>
            </div>
          </div>
  )
}
