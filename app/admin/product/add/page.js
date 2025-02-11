export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import ModalButton from "@/components/modal/ModalButton";
import ProductForm from "@/components/products/ProductForm";

export default async function ProductAdd() {
  const data = await getCategory();

  return (
    <div className=" p-4">
      <ModalButton>
        <ProductForm />
      </ModalButton>
      <div>Product Add</div>
      <div className="w-full ">
        {/* <AddProductForm category={data?.data} /> */}
        <ProductForm category={data?.data} actionType={"add"} />
      </div>
    </div>
  );
}
