"use server";

import prisma from "@/lib/prisma";
import { createCatalogImageFingerprint } from "@/backend/services/imageFingerprint";
import { revalidatePath, revalidateTag } from "next/cache";
import { cloudinaryDestroy, cloudinaryUpload } from "../utils/cloudinary";
import { newSlug } from "../utils/generateSlug";
import { requireProcurementPermission } from "../utils/procurement";
import { getMediaUsageIndex, syncLegacyChatMedia } from "@/backend/services/mediaUsageService";

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
        const imageFingerprint = await createCatalogImageFingerprint(
          Buffer.from(await file.arrayBuffer()),
        );
        return {
          url: upload.secure_url,
          host: "cloudinary",
          name: `${upload.display_name}.${upload.format}`,
          displayName: displayName || fallbackName,
          width: Number.isFinite(upload.width) ? upload.width : null,
          height: Number.isFinite(upload.height) ? upload.height : null,
          sizeBytes: Number.isFinite(upload.bytes) ? upload.bytes : file.size,
          ...(imageFingerprint || {}),
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
  await syncLegacyChatMedia();
  const media = await prisma.media.findMany({ orderBy: { createdAt: "desc" } });
    const usageIndex = await getMediaUsageIndex(media);
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
    const usageIndex = await getMediaUsageIndex([item]);
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
