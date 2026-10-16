ALTER TABLE "Order" ADD COLUMN "customerConfirmedAt" TIMESTAMP(3);
ALTER TABLE "SiteSetting" ADD COLUMN "orderReconfirmEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "SiteSetting" ADD COLUMN "orderReconfirmMessage" VARCHAR(500);