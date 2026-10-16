ALTER TABLE "Refund" ADD COLUMN "returnReceiptId" TEXT;

CREATE INDEX "Refund_returnReceiptId_idx" ON "Refund"("returnReceiptId");

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_returnReceiptId_fkey"
FOREIGN KEY ("returnReceiptId") REFERENCES "ReturnReceipt"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
