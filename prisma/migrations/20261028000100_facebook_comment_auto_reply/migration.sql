ALTER TABLE "ChatSetting"
ADD COLUMN "facebookCommentAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "FacebookPageCommentReply" (
  "id" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "postId" TEXT,
  "authorId" TEXT,
  "authorName" TEXT,
  "commentText" TEXT NOT NULL,
  "commentCreatedAt" TIMESTAMP(3),
  "replyText" TEXT,
  "replyCommentId" TEXT,
  "privateReplyText" TEXT,
  "privateReplyMessageId" TEXT,
  "privateReplyAt" TIMESTAMP(3),
  "privateReplyStatus" TEXT,
  "privateReplyError" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "repliedAt" TIMESTAMP(3),
  CONSTRAINT "FacebookPageCommentReply_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacebookPageCommentReply_commentId_key"
ON "FacebookPageCommentReply"("commentId");

CREATE INDEX "FacebookPageCommentReply_pageId_createdAt_idx"
ON "FacebookPageCommentReply"("pageId", "createdAt");

CREATE INDEX "FacebookPageCommentReply_status_createdAt_idx"
ON "FacebookPageCommentReply"("status", "createdAt");
