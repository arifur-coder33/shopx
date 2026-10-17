CREATE TYPE "ChatChannel" AS ENUM ('WEBSITE', 'WHATSAPP', 'MESSENGER');
CREATE TYPE "ChatConversationStatus" AS ENUM ('OPEN', 'PENDING', 'CLOSED');
CREATE TYPE "ChatMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "ChatMessageAuthorType" AS ENUM ('CUSTOMER', 'AGENT', 'AI', 'SYSTEM');

CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "status" "ChatConversationStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "aiModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "direction" "ChatMessageDirection" NOT NULL,
    "authorType" "ChatMessageAuthorType" NOT NULL,
    "authorId" TEXT,
    "content" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'RECEIVED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatSetting" (
    "id" TEXT NOT NULL,
    "websiteChatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "messengerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?',
    "encryptedCredentials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    CONSTRAINT "ChatSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatConversation_channel_externalUserId_key" ON "ChatConversation"("channel", "externalUserId");
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");
CREATE INDEX "ChatConversation_channel_status_lastMessageAt_idx" ON "ChatConversation"("channel", "status", "lastMessageAt");
CREATE INDEX "ChatConversation_assignedToId_status_idx" ON "ChatConversation"("assignedToId", "status");
CREATE UNIQUE INDEX "ChatMessage_channel_externalMessageId_key" ON "ChatMessage"("channel", "externalMessageId");
CREATE INDEX "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId", "createdAt");

ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_assignedToId_fkey"
FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "ChatSetting" ("id", "websiteChatEnabled", "updatedAt")
VALUES ('primary', true, CURRENT_TIMESTAMP);

INSERT INTO "Resource" ("id", "key", "createdAt", "updatedAt")
VALUES ('chat-support-resource', 'chat', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
