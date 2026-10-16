-- The first return migration has already added a unique index. A single
-- return receipt may need both a delivery-failure expense and a disposal
-- expense, so allow multiple expense rows per receipt.
DROP INDEX "Expense_returnReceiptId_key";
CREATE INDEX "Expense_returnReceiptId_idx" ON "Expense"("returnReceiptId");
