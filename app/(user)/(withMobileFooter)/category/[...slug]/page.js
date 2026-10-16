// export const dynamic = "force-static"; //
import { getCategoryPageData } from "@/backend/serverActions/catagoryActions";
import ProductListHeader from "@/components/products/productListHeader";
import CategoryProductGrid from "./CategoryProductGrid";
import prisma from "@/lib/prisma";
import Breadcrumb from "@/components/common/Breadcrumb";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicSiteIdentity } from "@/backend/services/siteAppearanceService";
import { getSiteUrl } from "@/lib/siteUrl";
import { notFound } from "next/navigation";
import { cloudinaryDetailImage } from "@/utils/cloudinaryUrl";
export const revalidate = 60;
export const dynamic = "force-static";
export const dynamicParams = true;
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const currentSlug = slug?.at(-1);
  const [category, identity] = await Promise.all([
    currentSlug
      ? prisma.category.findUnique({
          where: { slug: currentSlug },
        select: {
          name: true,
          description: true,
          fullPath: true,
          slug: true,
          thumbnail: { select: { name: true } },
        },
        })
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
    openGraph: {
      title: category.name,
      description,
      url,
      type: "website",
      ...(category.thumbnail?.name && {
        images: [{
          url: cloudinaryDetailImage(category.thumbnail.name, 1200),
          alt: category.name,
        }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: category.name,
      description,
      ...(category.thumbnail?.name && {
        images: [cloudinaryDetailImage(category.thumbnail.name, 1200)],
      }),
    },
    keywords: [category.name, `${category.name} online`, `${category.name} Bangladesh`],
    robots: { index: true, follow: true },
  };
}

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
      <ProductListHeader headerName={result.category.name} />
      <CategoryProductGrid
        initialProducts={data}
        initialCursor={result.nextCursor}
        variationOptions={result.variationOptions || []}
        categorySlug={slug[slug.length - 1]}
      />
    </>
  );
}
