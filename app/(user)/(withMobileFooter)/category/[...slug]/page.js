// export const dynamic = "force-static"; //
import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";
import Breadcrumb from "@/components/common/Breadcrumb";
export const revalidate = 60;
async function generateStaticParams() {
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

  const result = await getCategoryPageData(slug[slug.length - 1]);
  const data = result?.data || [];

  return (
    <>
      <Breadcrumb items={result?.breadcrumbs || []} className="mb-2" />
      <ProductList headerName={result?.category?.name}>
        {data.length > 0
          ? data.map((product, index) => (
              <ProductCard
                key={product?.id}
                product={product}
                priority={index < 2}
              />
            ))
          : "No Product found."}
      </ProductList>
    </>
  );
}
