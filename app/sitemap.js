import prisma from "@/lib/prisma";
import { getSiteUrl } from "@/lib/siteUrl";
import { productSeoImages, productSeoVideos } from "@/backend/utils/productSeo";

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
    const [products, categories, contentPages, campaigns] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: {
          slug: true,
          title: true,
          description: true,
          seoDescription: true,
          createdAt: true,
          updatedAt: true,
          thumbnail: { select: { name: true } },
          gallery: { select: { media: { select: { name: true } } } },
          variations: { select: { thumbnail: { select: { name: true } } } },
          videos: {
            orderBy: { sortOrder: "asc" },
            select: { header: true, url: true, createdAt: true },
          },
        },
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
      prisma.campaign.findMany({
        where: {
          status: "PUBLISHED",
          OR: [{ endAt: null }, { endAt: { gte: new Date() } }],
        },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    return [
      home,
      {
        url: absolute("/campaign"),
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.7,
      },
      ...campaigns.map((campaign) => ({
        url: absolute(`/campaign/${encodeURIComponent(campaign.id)}`),
        lastModified: campaign.updatedAt,
        changeFrequency: "daily",
        priority: 0.6,
      })),
      ...categories.map((category) => ({
        url: categoryUrl(category, siteUrl),
        lastModified: category.updatedAt,
        changeFrequency: "weekly",
        priority: category.fullPath?.includes("/") ? 0.7 : 0.9,
      })),
      ...products.map((product) => {
        const normalizedProduct = {
          ...product,
          gallery: product.gallery.map((item) => item.media),
        };
        return {
          url: absolute(`/product/${encodeURIComponent(product.slug)}`),
          lastModified: product.updatedAt,
          changeFrequency: "weekly",
          priority: 0.8,
          images: productSeoImages(normalizedProduct, siteUrl),
          videos: productSeoVideos(normalizedProduct, siteUrl),
        };
      }),
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
