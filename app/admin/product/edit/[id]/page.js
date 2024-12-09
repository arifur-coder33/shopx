export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import { getProductById } from "@/backend/serverActions/productActions";
import EditProductForm from "@/components/products/EditProductForm";

export default async function ProductEdit({ params }) {
  const { id } = await params;

  const data = await getCategory();
  const getProduct = await getProductById(id);

  return (
    <div className=" p-4">
      <div>Product Add</div>
      <div className="w-full ">
        <EditProductForm data={getProduct?.data} category={data?.data} />
      </div>
    </div>
  );
}
