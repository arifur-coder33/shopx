"use server";

import prisma from "@/lib/prisma";
import { requireProcurementPermission } from "@/backend/utils/procurement";
import { revalidatePath } from "next/cache";

const clean = (value, limit) => String(value || "").trim().slice(0, limit);

export async function getPhotoReviewsForAdmin() {
  try {
    await requireProcurementPermission("contentPage", "view");
    const reviews = await prisma.photoReview.findMany({
        where: { productId: null },
        include: {
          image: { select: { id: true, url: true, name: true, displayName: true, width: true, height: true, sizeBytes: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      });
    return { success: true, data: { reviews } };
  } catch (error) {
    return { success: false, message: error?.message || "Could not load reviews." };
  }
}

export async function createPhotoReview(formData) {
  try {
    const userId = await requireProcurementPermission("contentPage", "create");
    const imageId = clean(formData.get("image"), 80).split(",")[0];
    const customerName = clean(formData.get("customerName"), 120) || null;
    const reviewText = clean(formData.get("reviewText"), 1000) || null;
    const ratingValue = clean(formData.get("rating"), 2);
    const rating = ratingValue ? Number(ratingValue) : null;
    if (!imageId) throw new Error("Select a review photo.");
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new Error("Rating must be from 1 to 5.");
    const image = await prisma.media.findUnique({ where: { id: imageId }, select: { id: true } });
    if (!image) throw new Error("Selected photo was not found in the media library.");
    await prisma.photoReview.create({ data: { imageId, customerName, reviewText, rating, createdBy: userId } });
    revalidatePath("/");
    revalidatePath("/admin/site-reviews");
    return { success: true, message: "Site photo review added." };
  } catch (error) {
    return { success: false, message: error?.message || "Could not add review." };
  }
}

export async function updatePhotoReviewVisibility(id, isPublished) {
  try {
    await requireProcurementPermission("contentPage", "update");
    const existing = await prisma.photoReview.findUnique({ where: { id }, select: { productId: true } });
    if (!existing || existing.productId) throw new Error("Manage product photo reviews from the product form.");
    await prisma.photoReview.update({
      where: { id },
      data: { isPublished: Boolean(isPublished) },
    });
    revalidatePath("/");
    revalidatePath("/admin/site-reviews");
    return { success: true, message: isPublished ? "Review published." : "Review hidden." };
  } catch (error) {
    return { success: false, message: error?.message || "Could not update review." };
  }
}

export async function deletePhotoReview(id) {
  try {
    await requireProcurementPermission("contentPage", "delete");
    const existing = await prisma.photoReview.findUnique({ where: { id }, select: { productId: true } });
    if (!existing || existing.productId) throw new Error("Manage product photo reviews from the product form.");
    await prisma.photoReview.delete({ where: { id } });
    revalidatePath("/");
    revalidatePath("/admin/site-reviews");
    return { success: true, message: "Review deleted." };
  } catch (error) {
    return { success: false, message: error?.message || "Could not delete review." };
  }
}
