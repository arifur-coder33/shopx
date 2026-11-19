ALTER TABLE "AbandonedCheckoutLead"
ADD COLUMN "lastError" TEXT,
ADD COLUMN "lastErrorAt" TIMESTAMP(3);
