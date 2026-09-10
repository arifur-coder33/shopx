import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";

export const revalidate = 3600;

const categoryUrl = (category, siteUrl) =>
  new URL(
    `/category/${String(category.fullPath || category.slug)
      .split("/")
      .filter(Boolean)
      .map(encodeURIComponent)
      .join("/")}`,
    `${siteUrl}/`,
  ).toString();

export default async function sitemap() {
  const siteUrl = await getSiteUrl();
  const absolute = (path) => new URL(path, `${siteUrl}/`).toString();
  const home = {
    url: absolute("/"),
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  };

  try {
    const [products, categories, contentPages] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.category.findMany({
        select: { slug: true, fullPath: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.contentPage.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      home,
      ...categories.map((category) => ({
        url: categoryUrl(category, siteUrl),
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: category.fullPath?.includes("/") ? 0.7 : 0.9,
      })),
      ...products.map((product) => ({
        url: absolute(`/product/${encodeURIComponent(product.slug)}`),
        lastModified: product.updatedAt,
        changeFrequency: "weekly",
        priority: 0.8,
      })),
      ...contentPages.map((page) => ({
        url: absolute(`/${encodeURIComponent(page.slug)}`),
        lastModified: page.updatedAt,
        changeFrequency: "monthly",
        priority: 0.5,
      })),
    ];
  } catch (error) {
    console.error("Failed to generate sitemap:", error);
    return [home];
  }
}
