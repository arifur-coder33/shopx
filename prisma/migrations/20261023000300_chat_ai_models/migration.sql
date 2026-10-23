ALTER TABLE "ChatSetting"
ADD COLUMN "openaiModel" TEXT NOT NULL DEFAULT 'gpt-6-luna',
ADD COLUMN "googleAiStudioModel" TEXT NOT NULL DEFAULT 'gemini-3.8-flash';
