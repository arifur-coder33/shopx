import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";

export default async function CategoryWithProductPage({ params }) {
  const getParams = await params;
  const { slug } = getParams;

  // const getData = unstable_cache(
  //   async () => {
  //     const data = await getCategoryWithproduct(slug);

  //     return data;
  //   },
  //   ["category"],
  //   { revalidate: 3600, tags: ["category"] }
  // );

  const { data } = await getCategoryPageData(slug[slug.length - 1]);
  console.log("data", data);
  console.log("length", data.length);
  return (
    <>
      <ProductList headerName={data?.name}>
        {data?.length > 0
          ? data?.map((product) => (
              <ProductCard key={product?.id} product={product} />
            ))
          : "No Product found."}
      </ProductList>
    </>
  );
}
