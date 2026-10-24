CREATE TABLE "ProductQuestionAnswer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" VARCHAR(3000) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductQuestionAnswer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductQuestionAnswer_productId_sortOrder_idx"
ON "ProductQuestionAnswer"("productId", "sortOrder");

ALTER TABLE "ProductQuestionAnswer"
ADD CONSTRAINT "ProductQuestionAnswer_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
