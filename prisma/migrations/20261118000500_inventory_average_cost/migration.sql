-- Additive follow-up migration: cost columns were added to the schema after
-- the inventory operations migration had already been applied in some DBs.
ALTER TABLE "Stock"
  ADD COLUMN IF NOT EXISTS "averageUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "InventoryTransaction"
  ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION;

ALTER TABLE "InventoryTransferItem"
  ADD COLUMN IF NOT EXISTS "unitCost" DOUBLE PRECISION;

-- Initialize current stock valuation from completed receipts. Keep any
-- non-zero average cost already recorded by a newer deployment.
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
), 0)
WHERE stock."averageUnitCost" = 0;
