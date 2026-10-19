ALTER TABLE "ChatMessage"
ADD COLUMN "mediaId" TEXT;

CREATE INDEX "ChatMessage_mediaId_idx"
ON "ChatMessage"("mediaId");

ALTER TABLE "ChatMessage"
ADD CONSTRAINT "ChatMessage_mediaId_fkey"
FOREIGN KEY ("mediaId") REFERENCES "Media"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
