import { createHash } from "node:crypto";
import { after } from "next/server";
import { auth } from "@/auth";
import { maybeSendChatAiReply } from "@/backend/services/chatAiReplyService";
import { sendChatPushNotification } from "@/backend/services/chatPushService";
import { cloudinaryDestroy, cloudinaryUpload } from "@/backend/utils/cloudinary";
import { getWebsitePageProductContext } from "@/backend/utils/chatWebsitePageContext.mjs";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const hashToken = (token) => createHash("sha256").update(token).digest("hex");
const rateBuckets = globalThis.__websiteChatImageRateBuckets || (globalThis.__websiteChatImageRateBuckets = new Map());

function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try { return new URL(origin).host === (request.headers.get("x-forwarded-host") || request.headers.get("host")); } catch { return false; }
}

export async function POST(request) {
  if (!isSameOrigin(request)) return Response.json({ success: false, message: "Invalid origin." }, { status: 403 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 6 * 1024 * 1024) return Response.json({ success: false, message: "Photo সর্বোচ্চ 5 MB হতে পারে।" }, { status: 413 });
  const clientAddress = (request.headers.get("x-forwarded-for") || "unknown").split(",").at(-1).trim();
  const now = Date.now();
  const bucket = rateBuckets.get(clientAddress);
  if (bucket && now - bucket.startedAt < 60_000 && bucket.count >= 5) return Response.json({ success: false, message: "এক মিনিটে সর্বোচ্চ 5টি photo পাঠানো যাবে।" }, { status: 429 });
  if (!bucket || now - bucket.startedAt >= 60_000) rateBuckets.set(clientAddress, { startedAt: now, count: 1 });
  else bucket.count += 1;

  const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { websiteChatEnabled: true } });
  if (setting?.websiteChatEnabled === false) return Response.json({ success: false, message: "Website chat is currently unavailable." }, { status: 403 });
  let form;
  try { form = await request.formData(); } catch { return Response.json({ success: false, message: "Invalid request." }, { status: 400 }); }
  const token = String(form.get("token") || "");
  const caption = String(form.get("content") || "").trim().slice(0, 2000);
  const websitePage = await getWebsitePageProductContext(
    form.get("pagePath") || request.headers.get("referer"),
  ).catch(() => null);
  const image = form.get("image");
  if (!/^[a-f0-9-]{36}$/i.test(token) || !image || typeof image.arrayBuffer !== "function" || !image.size) return Response.json({ success: false, message: "একটি photo বেছে নিন।" }, { status: 400 });
  if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) return Response.json({ success: false, message: "JPG, PNG বা WebP photo দিন (সর্বোচ্চ 5 MB)।" }, { status: 400 });

  const session = await auth();
  const account = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, phone: true } }) : null;
  const name = account?.name || String(form.get("name") || "").trim().slice(0, 100) || null;
  const phone = account?.phone || String(form.get("phone") || "").trim().slice(0, 30) || null;
  const upload = await cloudinaryUpload({ image, tag: "website-chat-customer-photo", slug: `website-chat-${Date.now()}`, perifix: "" });
  if (!upload?.secure_url || !upload?.public_id) return Response.json({ success: false, message: "Photo upload করা যায়নি। আবার চেষ্টা করুন।" }, { status: 502 });

  const mediaName = `${upload.display_name || upload.public_id}.${upload.format}`;
  let media;
  try {
    const externalUserId = hashToken(token);
    const conversation = await prisma.chatConversation.upsert({
      where: { channel_externalUserId: { channel: "WEBSITE", externalUserId } },
      create: { channel: "WEBSITE", externalUserId, customerName: name, customerPhone: phone, customerUserId: account?.id || null, lastMessageAt: new Date() },
      update: { ...(name && { customerName: name }), ...(phone && { customerPhone: phone }), ...(account?.id && { customerUserId: account.id }), lastMessageAt: new Date() },
    });
    media = await prisma.media.create({ data: { url: upload.secure_url, name: mediaName, displayName: image.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Customer chat photo", host: "cloudinary", width: Number.isFinite(upload.width) ? upload.width : null, height: Number.isFinite(upload.height) ? upload.height : null, sizeBytes: Number.isFinite(upload.bytes) ? upload.bytes : image.size } });
    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({ data: { conversationId: conversation.id, channel: "WEBSITE", direction: "INBOUND", authorType: "CUSTOMER", content: caption || "📷 Photo", deliveryStatus: "DELIVERED", mediaId: media.id, metadata: { type: "IMAGE", image: { url: upload.secure_url, mediaId: media.id, mimeType: image.type, caption }, ...(websitePage && { websitePage }) } } });
      await tx.chatConversation.update({ where: { id: conversation.id }, data: { lastMessageAt: new Date(), status: conversation.needsHumanAssistant ? "PENDING" : "OPEN", unreadCount: { increment: 1 } } });
      return created;
    });
    after(async () => {
      await Promise.allSettled([
        sendChatPushNotification({ conversationId: conversation.id, channel: "WEBSITE", customerName: name, customerPhone: phone, content: message.content }),
        maybeSendChatAiReply(conversation.id, message.id),
      ]);
    });
    return Response.json({ success: true, data: message }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (media?.id) await prisma.media.delete({ where: { id: media.id } }).catch(() => {});
    await cloudinaryDestroy(mediaName).catch(() => {});
    console.error("Website customer photo could not be saved:", error?.message || error);
    return Response.json({ success: false, message: "Photo chat-এ পাঠানো যায়নি।" }, { status: 500 });
  }
}
