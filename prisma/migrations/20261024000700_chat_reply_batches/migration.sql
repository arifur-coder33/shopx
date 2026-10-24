ALTER TABLE "ChatConversation"
ADD COLUMN "aiReplyLeaseToken" TEXT,
ADD COLUMN "aiReplyLeaseUntil" TIMESTAMP(3);

ALTER TABLE "Order" ADD COLUMN "chatCheckoutKey" TEXT;
CREATE UNIQUE INDEX "Order_chatCheckoutKey_key" ON "Order"("chatCheckoutKey");
