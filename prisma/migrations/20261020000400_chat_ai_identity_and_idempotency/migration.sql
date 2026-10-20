ALTER TABLE "ChatConversation"
ADD COLUMN "preferredAddress" TEXT,
ADD COLUMN "customerUserId" TEXT;

ALTER TABLE "ChatConversation"
ALTER COLUMN "aiModeEnabled" SET DEFAULT true;

UPDATE "ChatConversation" SET "aiModeEnabled" = true;

ALTER TABLE "ChatMessage"
ADD COLUMN "aiReplyForMessageId" TEXT;

CREATE UNIQUE INDEX "ChatMessage_aiReplyForMessageId_key"
ON "ChatMessage"("aiReplyForMessageId");

CREATE INDEX "ChatConversation_customerUserId_idx"
ON "ChatConversation"("customerUserId");

ALTER TABLE "ChatConversation"
ADD CONSTRAINT "ChatConversation_customerUserId_fkey"
FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
