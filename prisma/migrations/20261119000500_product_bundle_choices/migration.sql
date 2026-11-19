CREATE TABLE "ProductBundleItem" (
  "id" TEXT NOT NULL,
  "bundleProductId" TEXT NOT NULL,
  "componentProductId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL CHECK ("quantity" > 0),
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductBundleItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductBundleItem_bundleProductId_fkey" FOREIGN KEY ("bundleProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductBundleItem_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ProductBundleItem_no_self_reference" CHECK ("bundleProductId" <> "componentProductId")
);
CREATE UNIQUE INDEX "ProductBundleItem_bundleProductId_componentProductId_key"
ON "ProductBundleItem"("bundleProductId", "componentProductId");
CREATE INDEX "ProductBundleItem_componentProductId_idx" ON "ProductBundleItem"("componentProductId");
