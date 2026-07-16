// export const dynamic = "force-static"; //
import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";
export const dynamic = "force-static";
export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      parentCategoryId: true,
    },
  });

  const buildPaths = (parentId = null, path = []) => {
    const children = categories.filter((c) => c.parentCategoryId === parentId);

    let result = [];

    for (const child of children) {
      const newPath = [...path, child.slug];

      result.push({
        slug: newPath,
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
