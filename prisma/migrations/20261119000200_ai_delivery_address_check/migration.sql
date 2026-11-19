ALTER TABLE "ChatSetting"
ADD COLUMN "aiDeliveryAddressCheckEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ChatSetting"
SET "aiDeliveryAddressCheckEnabled" = "aiAutoReplyEnabled";
