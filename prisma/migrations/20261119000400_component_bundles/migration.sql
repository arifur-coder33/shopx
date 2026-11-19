CREATE TYPE "ProductStockMode" AS ENUM ('OWN_STOCK', 'COMPONENT_BASED');

ALTER TABLE "Product" ADD COLUMN "stockMode" "ProductStockMode" NOT NULL DEFAULT 'OWN_STOCK';
ALTER TABLE "Order" ADD COLUMN "bundleReservationWarehouseId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "bundleComponents" JSONB;

CREATE TABLE "BundleComponent" (
  "bundleVariationId" TEXT NOT NULL,
  "componentVariationId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  CONSTRAINT "BundleComponent_pkey" PRIMARY KEY ("bundleVariationId", "componentVariationId"),
  CONSTRAINT "BundleComponent_bundleVariationId_fkey" FOREIGN KEY ("bundleVariationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BundleComponent_componentVariationId_fkey" FOREIGN KEY ("componentVariationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BundleComponent_no_self_reference" CHECK ("bundleVariationId" <> "componentVariationId")
);
CREATE INDEX "BundleComponent_componentVariationId_idx" ON "BundleComponent"("componentVariationId");
