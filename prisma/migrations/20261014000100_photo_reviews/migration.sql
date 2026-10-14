CREATE TABLE "PhotoReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "imageId" TEXT NOT NULL,
    "customerName" TEXT,
    "reviewText" VARCHAR(1000),
    "rating" INTEGER,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PhotoReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PhotoReview_productId_isPublished_sortOrder_idx"
ON "PhotoReview"("productId", "isPublished", "sortOrder");

CREATE INDEX "PhotoReview_imageId_idx" ON "PhotoReview"("imageId");

ALTER TABLE "PhotoReview"
ADD CONSTRAINT "PhotoReview_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhotoReview"
ADD CONSTRAINT "PhotoReview_imageId_fkey"
FOREIGN KEY ("imageId") REFERENCES "Media"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
