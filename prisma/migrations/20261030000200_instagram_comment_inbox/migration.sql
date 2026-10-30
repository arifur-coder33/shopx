ALTER TABLE "ChatSetting"
ADD COLUMN "instagramCommentAutoReplyEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FacebookPageCommentReply"
ADD COLUMN "platform" TEXT NOT NULL DEFAULT 'FACEBOOK';

DROP INDEX "FacebookPageCommentReply_commentId_key";
DROP INDEX "FacebookPageCommentReply_pageId_createdAt_idx";

CREATE UNIQUE INDEX "FacebookPageCommentReply_platform_commentId_key"
ON "FacebookPageCommentReply"("platform", "commentId");

CREATE INDEX "FacebookPageCommentReply_platform_pageId_createdAt_idx"
ON "FacebookPageCommentReply"("platform", "pageId", "createdAt");
