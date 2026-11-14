CREATE TABLE "EmailConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'EMAIL',
  "encryptedCredentials" TEXT,
  "fromEmail" TEXT,
  "fromName" TEXT,
  "supportInboxEmail" TEXT,
  "emailVerificationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "passwordResetEnabled" BOOLEAN NOT NULL DEFAULT true,
  "orderConfirmationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "orderStatusEnabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportEmailConversation" (
  "id" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "normalizedSubject" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupportEmailConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportEmailMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "fromEmail" TEXT NOT NULL,
  "toEmail" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "textBody" TEXT NOT NULL,
  "htmlBody" TEXT,
  "resendEmailId" TEXT,
  "internetMessageId" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupportEmailMessage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupportEmailMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SupportEmailConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SupportEmailMessage_resendEmailId_key" ON "SupportEmailMessage"("resendEmailId");
CREATE INDEX "SupportEmailConversation_lastMessageAt_idx" ON "SupportEmailConversation"("lastMessageAt");
CREATE INDEX "SupportEmailConversation_customerEmail_normalizedSubject_idx" ON "SupportEmailConversation"("customerEmail", "normalizedSubject");
CREATE INDEX "SupportEmailMessage_conversationId_createdAt_idx" ON "SupportEmailMessage"("conversationId", "createdAt");
CREATE INDEX "SupportEmailMessage_direction_isRead_createdAt_idx" ON "SupportEmailMessage"("direction", "isRead", "createdAt");

ALTER TABLE "User"
ADD COLUMN "passwordResetOtpHash" TEXT,
ADD COLUMN "passwordResetOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN "passwordResetOtpSentAt" TIMESTAMP(3),
ADD COLUMN "passwordResetOtpAttempts" INTEGER NOT NULL DEFAULT 0;
