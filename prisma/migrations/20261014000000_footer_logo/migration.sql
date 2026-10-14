ALTER TABLE "ContentPage"
ADD COLUMN "footerLogoId" TEXT;

CREATE INDEX "ContentPage_footerLogoId_idx" ON "ContentPage"("footerLogoId");

ALTER TABLE "ContentPage"
ADD CONSTRAINT "ContentPage_footerLogoId_fkey"
FOREIGN KEY ("footerLogoId") REFERENCES "Media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
