import { getAllCategoryWithproduct } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";

export default async function CategoryWiseProductList() {
  const { data } = await getAllCategoryWithproduct();
  console.log(data);
  return (
    <>
      {data?.length > 0 &&
        data?.map((category) => (
          <>
            <div className="mt-4 sm:mt-6 rounded-md border-2 border-b-4 p-2">
              <ProductList link={category?.slug} headerName={category?.name}>
                {category?.products?.length > 0 &&
                  category?.products?.map((product) => (
                    <ProductCard key={product?.id} product={product} />
                  ))}
              </ProductList>
            </div>
          </>
        ))}
    </>
  );
}
