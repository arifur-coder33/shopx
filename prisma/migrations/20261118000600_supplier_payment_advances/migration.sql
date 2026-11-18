ALTER TABLE "SupplierPayment"
ADD COLUMN "paymentType" TEXT NOT NULL DEFAULT 'PO_PAYMENT',
ADD COLUMN "notes" TEXT;

CREATE TABLE "SupplierPaymentAllocation" (
    "id" TEXT NOT NULL,
    "supplierPaymentId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "allocatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "SupplierPaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupplierPaymentAllocation_supplierPaymentId_allocatedAt_idx"
ON "SupplierPaymentAllocation"("supplierPaymentId", "allocatedAt");
CREATE INDEX "SupplierPaymentAllocation_purchaseOrderId_idx"
ON "SupplierPaymentAllocation"("purchaseOrderId");

ALTER TABLE "SupplierPaymentAllocation"
ADD CONSTRAINT "SupplierPaymentAllocation_supplierPaymentId_fkey"
FOREIGN KEY ("supplierPaymentId") REFERENCES "SupplierPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SupplierPaymentAllocation"
ADD CONSTRAINT "SupplierPaymentAllocation_purchaseOrderId_fkey"
FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
