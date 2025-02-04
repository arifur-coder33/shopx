export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import AddCatagoryForm from "@/components/catagory/AddCategoryForm";

export default async function CategoryAddPage() {
  const { data } = await getCategory();
  return (
    <div className=" p-4">
      <div>Add New Category</div>
      <div className="w-full ">
        <AddCatagoryForm category={data} />
      </div>
    </div>
  );
}
