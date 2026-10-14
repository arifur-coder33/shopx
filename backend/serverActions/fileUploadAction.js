"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary";
import { newSlug } from "../utils/generateSlug";
import { requireProcurementPermission } from "../utils/procurement";

function addUsage(index, mediaId, usage) {
  if (!mediaId) return;
  index.get(mediaId)?.push(usage);
}

async function getUsageIndex(media) {
  const ids = media.map((item) => item.id);
  const names = media.map((item) => item.name);
  const index = new Map(ids.map((id) => [id, []]));
  if (!ids.length) return index;

  const [categories, products, galleries, variations, banners, slides, documents, settings, campaigns, footerPages, photoReviews] = await Promise.all([
    prisma.category.findMany({ where: { OR: [{ thumbnailId: { in: ids } }, { bannerId: { in: ids } }] }, select: { id: true, name: true, thumbnailId: true, bannerId: true } }),
    prisma.product.findMany({ where: { thumbnailId: { in: ids } }, select: { id: true, title: true, thumbnailId: true } }),
    prisma.productGallery.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, product: { select: { id: true, title: true } } } }),
    prisma.productVariation.findMany({ where: { thumbnailId: { in: ids } }, select: { thumbnailId: true, sku: true, product: { select: { id: true, title: true } } } }),
    prisma.banner.findMany({ where: { thumbnailId: { in: ids } }, select: { id: true, name: true, thumbnailId: true } }),
    prisma.heroSlide.findMany({ where: { imageId: { in: ids } }, select: { id: true, title: true, imageId: true } }),
    prisma.supplierDocument.findMany({ where: { mediaId: { in: ids } }, select: { mediaId: true, supplier: { select: { id: true, companyName: true } } } }),
    prisma.siteSetting.findMany({ where: { OR: [{ logo: { in: names } }, { favicon: { in: names } }] }, select: { id: true, logo: true, favicon: true } }),
    prisma.campaign.findMany({ where: { bannerUrl: { in: names } }, select: { id: true, name: true, bannerUrl: true } }),
    prisma.contentPage.findMany({ where: { footerLogoId: { in: ids } }, select: { id: true, title: true, footerLogoId: true } }),
    prisma.photoReview.findMany({ where: { imageId: { in: ids } }, select: { id: true, imageId: true, customerName: true, product: { select: { title: true } } } }),
  ]);

  for (const row of categories) {
    addUsage(index, row.thumbnailId, { section: "Category thumbnail", title: row.name, href: "/admin/categories" });
    addUsage(index, row.bannerId, { section: "Category banner", title: row.name, href: "/admin/categories" });
  }
  for (const row of products) addUsage(index, row.thumbnailId, { section: "Product thumbnail", title: row.title, href: "/admin/products" });
  for (const row of galleries) addUsage(index, row.mediaId, { section: "Product gallery", title: row.product?.title || "Product", href: "/admin/products" });
  for (const row of variations) addUsage(index, row.thumbnailId, { section: "Product variation", title: `${row.product?.title || "Product"}${row.sku ? ` · ${row.sku}` : ""}`, href: "/admin/products" });
  for (const row of banners) addUsage(index, row.thumbnailId, { section: "Home banner", title: row.name || "Home banner", href: "/admin/banner" });
  for (const row of slides) addUsage(index, row.imageId, { section: "Hero slider", title: row.title || "Slider image", href: "/admin/banner" });
  for (const row of documents) addUsage(index, row.mediaId, { section: "Supplier document", title: row.supplier?.companyName || "Supplier", href: "/admin/suppliers" });
  for (const row of settings) {
    if (row.logo) addUsage(index, ids[names.indexOf(row.logo)], { section: "Site logo", title: "Site appearance", href: "/admin/settings/site-appearance" });
    if (row.favicon) addUsage(index, ids[names.indexOf(row.favicon)], { section: "Favicon", title: "Site appearance", href: "/admin/settings/site-appearance" });
  }
  for (const row of campaigns) addUsage(index, ids[names.indexOf(row.bannerUrl)], { section: "Campaign banner", title: row.name, href: `/admin/campaigns/${row.id}/edit` });
  for (const row of footerPages) addUsage(index, row.footerLogoId, { section: "Footer logo", title: row.title || "Footer content", href: "/admin/settings/content-pages" });
  for (const row of photoReviews) addUsage(index, row.imageId, { section: row.product ? "Product review photo" : "Site review photo", title: row.product?.title || row.customerName || "Photo review", href: "/admin/site-reviews" });
  return index;
}

export async function uploadImagesAction(formData) {
  try {
    await requireProcurementPermission("media", "create");
    const files = formData.getAll("imageGallery").filter((file) => file && typeof file.size === "number" && file.size > 0 && typeof file.arrayBuffer === "function");
    const displayNames = formData.getAll("imageGalleryName");
    if (!files.length) return { success: false, message: "Choose at least one image." };

    const uploadedMedia = await Promise.all(files.map(async (file, index) => {
      try {
        const fallbackName = file.name.replace(/\.[^.]+$/, "").trim() || "image";
        const displayName = String(displayNames[index] || fallbackName).trim().slice(0, 120);
        const slug = (await newSlug(displayName || fallbackName)) || "image";
        const upload = await cloudinaryUpload({ image: file, tag: slug, slug, perifix: "_media" });
        if (!upload?.secure_url) return null;
        return {
          url: upload.secure_url,
          host: "cloudinary",
          name: `${upload.display_name}.${upload.format}`,
          displayName: displayName || fallbackName,
          width: Number.isFinite(upload.width) ? upload.width : null,
          height: Number.isFinite(upload.height) ? upload.height : null,
          sizeBytes: Number.isFinite(upload.bytes) ? upload.bytes : file.size,
        };
      } catch (error) {
        console.error("Media upload failed:", error?.message || error);
        return null;
      }
    }));

    const validUploads = uploadedMedia.filter(Boolean);
    if (!validUploads.length) return { success: false, message: "All image uploads failed." };
    await prisma.media.createMany({ data: validUploads });
    revalidatePath("/admin/media");
    revalidateTag("media");
    return { success: true, message: `${validUploads.length} image${validUploads.length === 1 ? "" : "s"} uploaded.`, data: validUploads };
  } catch (error) {
    return { success: false, message: error?.message || "Image upload failed. Please try again." };
  }
}

export async function getAllMedia() {
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
  const usageIndex = await getUsageIndex(media);
  const data = media.map((item) => {
    const usedIn = usageIndex.get(item.id) || [];
    return { ...item, usedIn, useCount: usedIn.length };
  });
  return { success: true, data };
}

export async function deleteMediaAction(id) {
  try {
    await requireProcurementPermission("media", "delete");
    const item = await prisma.media.findUnique({ where: { id } });
    if (!item) throw new Error("Media was not found.");
    const usageIndex = await getUsageIndex([item]);
    const usedIn = usageIndex.get(item.id) || [];
    if (usedIn.length) throw new Error(`This media is in use ${usedIn.length} time(s) and cannot be deleted.`);
    await cloudinaryDestroy(item.name);
    await prisma.media.delete({ where: { id } });
    revalidatePath("/admin/media");
    revalidateTag("media");
    return { success: true, data: "Media deleted." };
  } catch (error) {
    return { success: false, error: error?.message || "Could not delete media." };
  }
}

export async function getAllMediaByIds(params) {
  const data = await prisma.media.findMany({ where: { id: { in: params } } });
  return { success: true, data };
}
