ALTER TABLE "ChatSetting"
ADD COLUMN "quickReplies" JSONB NOT NULL DEFAULT '[]'::jsonb;
