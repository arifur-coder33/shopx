ALTER TABLE "PhotoReview"
ALTER COLUMN "imageId" DROP NOT NULL;

ALTER TABLE "PhotoReview"
ADD COLUMN "orderItemId" TEXT,
ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "PhotoReview_orderItemId_key" ON "PhotoReview"("orderItemId");
CREATE INDEX "PhotoReview_userId_createdAt_idx" ON "PhotoReview"("userId", "createdAt");

ALTER TABLE "PhotoReview"
ADD CONSTRAINT "PhotoReview_orderItemId_fkey"
FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PhotoReview"
ADD CONSTRAINT "PhotoReview_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
