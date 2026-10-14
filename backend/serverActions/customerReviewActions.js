"use server";

import { auth } from "@/auth";
import { cloudinaryUpload } from "@/backend/utils/cloudinary";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const clean = (value, max) => String(value || "").trim().slice(0, max);
const MAX_REVIEW_PHOTO_BYTES = 5 * 1024 * 1024;
const REVIEW_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function getCurrentUserId() {
  const session = await auth();
  return session?.user?.id || null;
}

export async function getMyProductReviewData() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: "Please sign in to view your reviews." };

    const [eligibleItems, reviews] = await Promise.all([
      prisma.orderItem.findMany({
        where: {
          order: { userId },
          photoReview: null,
          OR: [
            { status: "DELIVERED" },
            { order: { status: "DELIVERED" } },
            { order: { timeline: { some: { status: "DELIVERED" } } } },
          ],
        },
        select: {
          id: true,
          productName: true,
          thumbnail: true,
          quantity: true,
          product: { select: { id: true, title: true, slug: true, thumbnail: { select: { name: true } } } },
          order: { select: { orderNo: true, createdAt: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.photoReview.findMany({
        where: { userId },
        include: {
          product: { select: { id: true, title: true, slug: true } },
          image: { select: { id: true, name: true, displayName: true, width: true, height: true } },
          orderItem: { select: { order: { select: { orderNo: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { success: true, data: { eligibleItems, reviews } };
  } catch (error) {
    return { success: false, message: error?.message || "Could not load your product reviews." };
  }
}

export async function createCustomerProductReview(formData) {
  let uploadedPublicId = null;
  try {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("Please sign in before submitting a review.");

    const orderItemId = clean(formData.get("orderItemId"), 80);
    const customerName = clean(formData.get("customerName"), 120) || null;
    const reviewText = clean(formData.get("reviewText"), 1000) || null;
    const ratingValue = clean(formData.get("rating"), 2);
    const rating = ratingValue ? Number(ratingValue) : null;
    const file = formData.get("photo");
    const hasPhoto = file && typeof file.size === "number" && file.size > 0 && typeof file.arrayBuffer === "function";

    if (!orderItemId) throw new Error("The delivered product was not found.");
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) throw new Error("Choose a rating from 1 to 5.");
    if (!reviewText && rating === null && !hasPhoto) throw new Error("Add a message, rating or photo to submit your review.");

    const orderItem = await prisma.orderItem.findFirst({
      where: {
        id: orderItemId,
        order: { userId },
        OR: [
          { status: "DELIVERED" },
          { order: { status: "DELIVERED" } },
          { order: { timeline: { some: { status: "DELIVERED" } } } },
        ],
        photoReview: null,
      },
      select: { id: true, productId: true, order: { select: { orderNo: true } } },
    });
    if (!orderItem) throw new Error("Only a product from your delivered order can be reviewed, and each delivered item can be reviewed once.");

    if (hasPhoto) {
      if (!REVIEW_PHOTO_TYPES.has(file.type)) throw new Error("Review photo must be JPG, PNG, WebP or GIF.");
      if (file.size > MAX_REVIEW_PHOTO_BYTES) throw new Error("Review photo must be 5 MB or smaller.");
    }

    let imageData = null;
    if (hasPhoto) {
      const upload = await cloudinaryUpload({ image: file, tag: "customer-product-review", slug: `review-${Date.now()}`, perifix: "_photo" });
      if (!upload?.secure_url || !upload?.public_id) throw new Error("The review photo could not be uploaded. Please try again.");
      uploadedPublicId = `${upload.display_name || upload.public_id}.${upload.format}`;
      imageData = {
        url: upload.secure_url,
        name: uploadedPublicId,
        displayName: customerName ? `${customerName} review photo` : "Customer review photo",
        host: "cloudinary",
        width: Number.isFinite(upload.width) ? upload.width : null,
        height: Number.isFinite(upload.height) ? upload.height : null,
        sizeBytes: Number.isFinite(upload.bytes) ? upload.bytes : file.size,
      };
    }

    const created = await prisma.$transaction(async (tx) => {
      const image = imageData ? await tx.media.create({ data: imageData }) : null;
      return tx.photoReview.create({
        data: {
          productId: orderItem.productId,
          orderItemId: orderItem.id,
          userId,
          createdBy: userId,
          imageId: image?.id || null,
          customerName,
          reviewText,
          rating,
          isPublished: true,
        },
        include: {
          product: { select: { id: true, title: true, slug: true } },
          image: { select: { id: true, name: true, displayName: true, width: true, height: true } },
          orderItem: { select: { order: { select: { orderNo: true } } } },
        },
      });
    });

    uploadedPublicId = null;
    revalidatePath("/my-account/review");
    revalidatePath(`/product/${created.product.slug}`);
    return { success: true, message: "Your product review has been submitted.", data: created };
  } catch (error) {
    if (uploadedPublicId) {
      try {
        const { cloudinaryDestroy } = await import("@/backend/utils/cloudinary");
        await cloudinaryDestroy(uploadedPublicId);
      } catch (cleanupError) {
        console.warn("Could not remove an unused customer review photo:", cleanupError?.message || cleanupError);
      }
    }
    return { success: false, message: error?.message || "Could not submit your review." };
  }
}
