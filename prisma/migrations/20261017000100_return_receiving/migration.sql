CREATE TYPE "ReturnReasonType" AS ENUM ('DELIVERY_FAIL', 'CUSTOMER_RETURN');
CREATE TYPE "ReturnDisposition" AS ENUM ('RESTOCK', 'DISPOSE');
CREATE TABLE "ReturnReceipt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "reasonType" "ReturnReasonType" NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" TEXT,
  CONSTRAINT "ReturnReceipt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ReturnReceiptItem" (
  "id" TEXT NOT NULL,
  "returnReceiptId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "variationId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "quantity" DOUBLE PRECISION NOT NULL,
  "disposition" "ReturnDisposition" NOT NULL,
  CONSTRAINT "ReturnReceiptItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Expense" ADD COLUMN "returnReceiptId" TEXT;
CREATE UNIQUE INDEX "Expense_returnReceiptId_key" ON "Expense"("returnReceiptId");
CREATE INDEX "ReturnReceipt_orderId_createdAt_idx" ON "ReturnReceipt"("orderId", "createdAt");
CREATE INDEX "ReturnReceiptItem_orderItemId_idx" ON "ReturnReceiptItem"("orderItemId");
ALTER TABLE "ReturnReceipt" ADD CONSTRAINT "ReturnReceipt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnReceiptItem" ADD CONSTRAINT "ReturnReceiptItem_returnReceiptId_fkey" FOREIGN KEY ("returnReceiptId") REFERENCES "ReturnReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnReceiptItem" ADD CONSTRAINT "ReturnReceiptItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnReceiptItem" ADD CONSTRAINT "ReturnReceiptItem_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReturnReceiptItem" ADD CONSTRAINT "ReturnReceiptItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_returnReceiptId_fkey" FOREIGN KEY ("returnReceiptId") REFERENCES "ReturnReceipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;