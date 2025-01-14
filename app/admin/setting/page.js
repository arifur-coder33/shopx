import { getSiteSetting } from "@/backend/serverActions/siteSettingAction";
import SiteSettingForm from "./_components/SiteSettingForm";

export const dynamic = "force-static";


export default async  function ProductListPage() {
  const {data}=await getSiteSetting()

 return (
    <div className=" p-4">
        <div className=" text-center py-2 font-bold bg-slate-400 dark:bg-slate-800 rounded-lg border-b-4 border-slate-500">Site setting</div>
        <div className="w-full ">
          <SiteSettingForm data={data} />
        </div>
      </div>
 )
}
