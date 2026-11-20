ALTER TABLE "Order"
  ADD COLUMN "gbraid" TEXT,
  ADD COLUMN "wbraid" TEXT,
  ADD COLUMN "gaClientId" TEXT;

ALTER TABLE "AbandonedCheckoutLead"
  ADD COLUMN "fbc" TEXT,
  ADD COLUMN "fbp" TEXT,
  ADD COLUMN "gaClientId" TEXT,
  ADD COLUMN "gclid" TEXT,
  ADD COLUMN "gbraid" TEXT,
  ADD COLUMN "wbraid" TEXT,
  ADD COLUMN "ttclid" TEXT,
  ADD COLUMN "marketingAttribution" JSONB;
