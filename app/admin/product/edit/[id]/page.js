export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import { getProductById } from "@/backend/serverActions/productActions";
import ProductForm from "@/components/products/ProductForm";

export default async function ProductEdit({ params }) {
  const { id } = await params;

  const getCat = await getCategory();
  // const getProduct = unstable_cache(
  //   async () => {
  //     const data = await getProductById(id);
  //     return data?.data;
  //   },
  //   [id],
  //   { revalidate: 3600, tags: [`product-${id}`] } // Use string array for tags
  // );

  // const data = await getProduct();
  const { data } = await getProductById(id);

  return (
    <div className=" p-4">
      <div>Product Edit</div>
      <div className="w-full ">
        {/* <EditProductForm data={data} category={getCat?.data} /> */}
        <ProductForm data={data} category={getCat?.data} actionType={"edit"} />
      </div>
    </div>
  );
}
