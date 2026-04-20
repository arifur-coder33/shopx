import {
  getCategory,
  getCategoryPageData,
} from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
export async function generateStaticParams() {
  const res = await getCategory();

  const categories = Array.isArray(res?.data) ? res.data : [];

  const buildPaths = (parentId = null, path = []) => {
    const children = categories.filter((c) =>
      parentId === null
        ? c.parentCategoryId === null
        : c.parentCategoryId === parentId,
    );

    let result = [];

    for (const child of children) {
      if (!child?.slug) continue; // 🔥 safety

      const newPath = [...path, child.slug];

      result.push({
        slug: newPath.filter(Boolean), // 🔥 important fix
      });

      result.push(...buildPaths(child.id, newPath));
    }

    return result;
  };

  return buildPaths();
}
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
