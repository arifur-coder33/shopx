ALTER TABLE "Order" ADD COLUMN "marketingAttribution" JSONB;
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
