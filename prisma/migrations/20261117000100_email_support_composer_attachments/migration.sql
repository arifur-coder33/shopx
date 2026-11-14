ALTER TABLE "SupportEmailMessage"
ADD COLUMN "attachmentsJson" TEXT;

CREATE TABLE "SupportEmailDraft" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT,
  "toEmail" TEXT,
  "subject" TEXT,
  "textBody" TEXT NOT NULL DEFAULT '',
  "attachmentsJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportEmailDraft_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SupportEmailDraft_updatedAt_idx" ON "SupportEmailDraft"("updatedAt");
