ALTER TABLE "ChatSetting"
ADD COLUMN "aiReplyTone" TEXT NOT NULL DEFAULT 'বন্ধুসুলভ, স্বাভাবিক, সংক্ষিপ্ত এবং একজন local shop owner-এর মতো',
ADD COLUMN "aiReplyExamples" JSONB NOT NULL DEFAULT '[]'::jsonb;
