import { getCategory } from "@/backend/serverActions/catagoryActions";
import AddProductForm from "@/components/products/AddProductForm";

export default async function ProductAdd() {
  const data=await getCategory()
  console.log(data)
  return (
    <div className=" p-4">
      <div>Product Add</div>
      <div className="w-full ">
      <AddProductForm category={data?.data}/>
      </div>
    </div>
  );
}
