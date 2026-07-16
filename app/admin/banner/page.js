import {
  getBanner,
  homeBannerUpdate,
} from "@/backend/serverActions/bannerAction";
import DynamicForm from "@/components/common/DynamicForm";

export const dynamic = "force-static";

export default async function BannerPage() {
  const { data } = await getBanner();
  const fromFields = [
    { type: "text", label: "Category Name", name: "name", colSpan: "full" },
    { type: "file", label: "Thumbnail", name: "thumbnail", colSpan: "full" },
  ];

  return (
    <div className=" p-4">
      <div className=" text-center py-2 font-bold bg-slate-400 dark:bg-slate-800 rounded-lg border-b-4 border-slate-500">
        Home Page Banner
      </div>
      <div className="w-full ">
        {/* <HomePageBannerForm data={data} /> */}
        <DynamicForm
          updateAction={homeBannerUpdate}
          fromFields={fromFields}
          actionType={"edit"}
          data={data}
        />
      </div>
    </div>
  );
}
