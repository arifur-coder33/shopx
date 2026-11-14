import { auth } from "@/auth";
import { getEmailConfiguration, parseEmailAttachments } from "@/backend/services/emailService";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

const safeName = (value) => String(value || "attachment").replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180);
const canPreview = (mimeType) => /^(image\/(?:png|jpeg|gif|webp)|application\/pdf|text\/plain)$/i.test(mimeType);
const fileResponse = (body, attachment, size) => new Response(body, {
  headers: {
    "content-type": attachment.mimeType,
    ...(size ? { "content-length": String(size) } : {}),
    "content-disposition": `${canPreview(attachment.mimeType) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(safeName(attachment.filename))}`,
    "x-content-type-options": "nosniff",
    "cache-control": "private, no-store",
  },
});

export async function GET(_request, { params }) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "chatInbox", "view")) return new Response("Unauthorized", { status: 401 });
  const { messageId, attachmentId } = await params;
  const message = await prisma.supportEmailMessage.findUnique({
    where: { id: messageId },
    select: { direction: true, resendEmailId: true, attachmentsJson: true },
  });
  if (!message) return new Response("Attachment not found", { status: 404 });
  const attachment = parseEmailAttachments(message.attachmentsJson, { includeContent: true }).find((item) => item.id === attachmentId);
  if (!attachment) return new Response("Attachment not found", { status: 404 });

  if (message.direction === "INBOUND") {
    const settings = await getEmailConfiguration();
    if (!settings.resendApiKey || !message.resendEmailId || !attachment.resendAttachmentId) return new Response("Attachment unavailable", { status: 404 });
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(message.resendEmailId)}/attachments/${encodeURIComponent(attachment.resendAttachmentId)}`, {
      headers: { Authorization: `Bearer ${settings.resendApiKey}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return new Response("Attachment could not be retrieved from Resend", { status: 502 });
    const result = await response.json().catch(() => ({}));
    const url = result?.data?.download_url || result?.download_url;
    if (!url) return new Response("Resend did not return an attachment URL", { status: 502 });
    let target;
    try { target = new URL(url); } catch { return new Response("Invalid attachment URL", { status: 502 }); }
    if (target.protocol !== "https:") return new Response("Invalid attachment URL", { status: 502 });
    const file = await fetch(target, { signal: AbortSignal.timeout(20000) });
    if (!file.ok) return new Response("Attachment download failed", { status: 502 });
    const size = Number(file.headers.get("content-length") || attachment.size || 0);
    return fileResponse(file.body, attachment, size);
  }

  if (!attachment.contentBase64) return new Response("Attachment content unavailable", { status: 404 });
  const bytes = Buffer.from(attachment.contentBase64, "base64");
  return fileResponse(bytes, attachment, bytes.length);
}
