ALTER TABLE "Warehouse" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'WAREHOUSE';
ALTER TABLE "Stock" ADD COLUMN "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "InventoryTransfer" (
  "id" TEXT NOT NULL,
  "transferNo" TEXT NOT NULL,
  "sourceWarehouseId" TEXT NOT NULL,
  "destinationWarehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "updatedBy" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelledBy" TEXT,
  "cancelReason" TEXT,
  CONSTRAINT "InventoryTransfer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryTransferItem" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "variationId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "receivedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  CONSTRAINT "InventoryTransferItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryCount" (
  "id" TEXT NOT NULL,
  "countNo" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "postedAt" TIMESTAMP(3),
  "postedBy" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelledBy" TEXT,
  "cancelReason" TEXT,
  CONSTRAINT "InventoryCount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryCountItem" (
  "id" TEXT NOT NULL,
  "countId" TEXT NOT NULL,
  "variationId" TEXT NOT NULL,
  "systemQuantity" DOUBLE PRECISION NOT NULL,
  "countedQuantity" DOUBLE PRECISION,
  CONSTRAINT "InventoryCountItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryBom" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "outputVariationId" TEXT NOT NULL,
  "outputQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InventoryBom_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryBomComponent" (
  "id" TEXT NOT NULL,
  "bomId" TEXT NOT NULL,
  "variationId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  CONSTRAINT "InventoryBomComponent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "InventoryConversion" (
  "id" TEXT NOT NULL,
  "conversionNo" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "bomId" TEXT,
  "type" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelledBy" TEXT,
  "cancelReason" TEXT,
  CONSTRAINT "InventoryConversion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryTransfer_transferNo_key" ON "InventoryTransfer"("transferNo");
CREATE INDEX "InventoryTransfer_sourceWarehouseId_status_createdAt_idx" ON "InventoryTransfer"("sourceWarehouseId", "status", "createdAt");
CREATE INDEX "InventoryTransfer_destinationWarehouseId_status_createdAt_idx" ON "InventoryTransfer"("destinationWarehouseId", "status", "createdAt");
CREATE INDEX "InventoryTransferItem_transferId_idx" ON "InventoryTransferItem"("transferId");
CREATE UNIQUE INDEX "InventoryCount_countNo_key" ON "InventoryCount"("countNo");
CREATE INDEX "InventoryCount_warehouseId_status_createdAt_idx" ON "InventoryCount"("warehouseId", "status", "createdAt");
CREATE UNIQUE INDEX "InventoryCountItem_countId_variationId_key" ON "InventoryCountItem"("countId", "variationId");
CREATE UNIQUE INDEX "InventoryBomComponent_bomId_variationId_key" ON "InventoryBomComponent"("bomId", "variationId");
CREATE INDEX "InventoryBom_outputVariationId_isActive_idx" ON "InventoryBom"("outputVariationId", "isActive");
CREATE UNIQUE INDEX "InventoryConversion_conversionNo_key" ON "InventoryConversion"("conversionNo");
CREATE INDEX "InventoryConversion_warehouseId_status_createdAt_idx" ON "InventoryConversion"("warehouseId", "status", "createdAt");

ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransfer" ADD CONSTRAINT "InventoryTransfer_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "InventoryTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryTransferItem" ADD CONSTRAINT "InventoryTransferItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCount" ADD CONSTRAINT "InventoryCount_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_countId_fkey" FOREIGN KEY ("countId") REFERENCES "InventoryCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryCountItem" ADD CONSTRAINT "InventoryCountItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBom" ADD CONSTRAINT "InventoryBom_outputVariationId_fkey" FOREIGN KEY ("outputVariationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryBomComponent" ADD CONSTRAINT "InventoryBomComponent_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "InventoryBom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryBomComponent" ADD CONSTRAINT "InventoryBomComponent_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryConversion" ADD CONSTRAINT "InventoryConversion_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryConversion" ADD CONSTRAINT "InventoryConversion_bomId_fkey" FOREIGN KEY ("bomId") REFERENCES "InventoryBom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TYPE "ReceiptStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TABLE "Stock" ADD COLUMN "averageUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "InventoryTransaction" ADD COLUMN "unitCost" DOUBLE PRECISION;
ALTER TABLE "InventoryTransferItem" ADD COLUMN "unitCost" DOUBLE PRECISION;

UPDATE "Stock" AS stock
SET "averageUnitCost" = COALESCE((
  SELECT SUM(receipt_item."quantity" * COALESCE(costs."unitCost", 0)) / NULLIF(SUM(receipt_item."quantity"), 0)
  FROM "GoodsReceiptItem" AS receipt_item
  JOIN "GoodsReceipt" AS receipt ON receipt."id" = receipt_item."goodsReceiptId"
  JOIN "PurchaseOrder" AS po ON po."id" = receipt."purchaseOrderId"
  CROSS JOIN LATERAL (
    SELECT AVG(GREATEST(0, purchase_item."unitCost" - purchase_item."discount" / NULLIF(purchase_item."quantity", 0))) AS "unitCost"
    FROM "PurchaseItem" AS purchase_item
    WHERE purchase_item."purchaseOrderId" = po."id"
      AND purchase_item."variationId" = receipt_item."variationId"
  ) AS costs
  WHERE receipt."warehouseId" = stock."warehouseId"
    AND receipt_item."variationId" = stock."variationId"
    AND receipt."status" = 'COMPLETED'
), 0);
