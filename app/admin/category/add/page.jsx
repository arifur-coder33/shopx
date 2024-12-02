export const dynamic = "force-static";
import AddCatagoryForm from "@/components/catagory/AddCategoryForm";

export default async function CategoryAddPage() {
  return (
    <div className=" p-4">
      <div>Product Add</div>
      <div className="w-full ">
        <AddCatagoryForm />
      </div>
    </div>
  );
}
