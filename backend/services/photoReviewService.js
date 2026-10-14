import prisma from "@/lib/prisma";

const publicReviewSelect = {
  id: true,
  customerName: true,
  reviewText: true,
  rating: true,
  createdAt: true,
  image: { select: { id: true, url: true, name: true, displayName: true, width: true, height: true } },
};

export async function getPublishedSitePhotoReviews() {
  return prisma.photoReview.findMany({
    where: { productId: null, isPublished: true },
    select: publicReviewSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getPublishedProductPhotoReviews(productId) {
  return prisma.photoReview.findMany({
    where: { productId, isPublished: true },
    select: publicReviewSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}
