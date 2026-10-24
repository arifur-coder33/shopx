ALTER TABLE "ChatSetting"
ADD COLUMN "whatsappTextTemplateName" TEXT,
ADD COLUMN "whatsappImageTemplateName" TEXT,
ADD COLUMN "whatsappTemplateLanguage" TEXT NOT NULL DEFAULT 'bn';
