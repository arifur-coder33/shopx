ALTER TABLE "ChatConversation" ADD COLUMN "normalizedPhone" TEXT;
ALTER TABLE "ChatConversation" ADD COLUMN "profilePicUrl" TEXT;

UPDATE "ChatConversation"
SET "normalizedPhone" = CASE
  WHEN regexp_replace("customerPhone", '[^0-9]', '', 'g') ~ '^01[0-9]{9}$'
    THEN '88' || regexp_replace("customerPhone", '[^0-9]', '', 'g')
  WHEN regexp_replace("customerPhone", '[^0-9]', '', 'g') ~ '^[0-9]{8,15}$'
    THEN regexp_replace("customerPhone", '[^0-9]', '', 'g')
  ELSE NULL
END
WHERE "customerPhone" IS NOT NULL;

CREATE INDEX "ChatConversation_normalizedPhone_lastMessageAt_idx"
ON "ChatConversation"("normalizedPhone", "lastMessageAt");
