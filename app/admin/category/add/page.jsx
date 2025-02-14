export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import CategoryForm from "@/components/catagory/CategoryForm";

export default async function CategoryAddPage() {
  const { data } = await getCategory();
  return (
    <div className=" p-4">
      <div>Add New Category</div>
      <div className="w-full ">
        <CategoryForm category={data} />
      </div>
    </div>
  );
}
