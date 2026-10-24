ALTER TABLE "ChatConversation"
ADD COLUMN "needsHumanAssistant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "humanAssistantReason" TEXT,
ADD COLUMN "awaitingHumanPhone" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ChatConversation_needsHumanAssistant_lastMessageAt_idx"
ON "ChatConversation"("needsHumanAssistant", "lastMessageAt");
