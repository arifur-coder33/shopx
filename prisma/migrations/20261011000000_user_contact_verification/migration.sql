ALTER TABLE "User"
ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationOtpHash" TEXT,
ADD COLUMN "emailVerificationOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationOtpSentAt" TIMESTAMP(3),
ADD COLUMN "emailVerificationOtpAttempts" INTEGER NOT NULL DEFAULT 0;
