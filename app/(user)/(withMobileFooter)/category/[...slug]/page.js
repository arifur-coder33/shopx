import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductCard from "@/components/products/ProductCard";
import ProductList from "@/components/products/productList";
import prisma from "@/lib/prisma";
import Breadcrumb from "@/components/common/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getSiteUrl } from "@/lib/siteUrl";
import { notFound } from "next/navigation";
import { requireCurrentStoreId } from "@/backend/services/storeContextService";
import { unstable_cache } from "next/cache";
export const revalidate = 60;
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const currentSlug = slug?.at(-1);
  const storeId = await requireCurrentStoreId();
  const [category, identity] = await Promise.all([
    currentSlug
      ? unstable_cache(
          () => prisma.category.findUnique({
            where: { storeId_slug: { storeId, slug: currentSlug } },
            select: { name: true, description: true, fullPath: true, slug: true },
          }),
          ["category-metadata", storeId, currentSlug],
          { revalidate: 60, tags: [`storefront-catalog:${storeId}`] },
        )()
      : null,
    getPublicSiteIdentity(),
  ]);
  if (!category) return { robots: { index: false, follow: false } };
  const path = String(category.fullPath || category.slug)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const description =
    category.description ||
    `${identity.name}-এ ${category.name} ক্যাটাগরির পণ্য দেখুন ও অনলাইনে অর্ডার করুন।`;
  const siteUrl = await getSiteUrl();
  const url = new URL(`/category/${path}`, `${siteUrl}/`).toString();
  return {
    title: category.name,
    description,
    alternates: { canonical: url },
    openGraph: { title: category.name, description, url, type: "website" },
    robots: { index: true, follow: true },
  };
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
  if (!result?.success) notFound();
  const data = result?.data || [];
  const siteUrl = await getSiteUrl();
  const absolute = (path) => new URL(path, `${siteUrl}/`).toString();
  const currentPath = `/category/${slug.map(encodeURIComponent).join("/")}`;
  const categorySchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${absolute(currentPath)}#collection`,
        url: absolute(currentPath),
        name: result.category.name,
        ...(result.category.description && { description: result.category.description }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: (result.breadcrumbs || []).map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.label,
          item: absolute(item.href || currentPath),
        })),
      },
    ],
  };

  return (
    <>
      <JsonLd data={categorySchema} />
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
