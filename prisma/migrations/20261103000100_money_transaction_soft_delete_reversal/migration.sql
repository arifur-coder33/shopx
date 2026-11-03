CREATE TYPE "MoneyTransactionStatus" AS ENUM ('POSTED', 'DELETED');

ALTER TYPE "MoneyTransactionType" ADD VALUE 'REVERSAL';

ALTER TABLE "MoneyTransaction"
ADD COLUMN "status" "MoneyTransactionStatus" NOT NULL DEFAULT 'POSTED',
ADD COLUMN "deletedAt" TIMESTAMP(3),
ADD COLUMN "deletedBy" TEXT,
ADD COLUMN "deleteReason" TEXT,
ADD COLUMN "isReversal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "reversalOfId" TEXT;

CREATE UNIQUE INDEX "MoneyTransaction_reversalOfId_key" ON "MoneyTransaction"("reversalOfId");
ALTER TABLE "MoneyTransaction"
ADD CONSTRAINT "MoneyTransaction_reversalOfId_fkey"
FOREIGN KEY ("reversalOfId") REFERENCES "MoneyTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedBy" TEXT,
ADD COLUMN "voidReason" TEXT;

ALTER TABLE "SupplierPayment"
ADD COLUMN "voidedAt" TIMESTAMP(3),
ADD COLUMN "voidedBy" TEXT,
ADD COLUMN "voidReason" TEXT;
