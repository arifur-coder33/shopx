import { auth } from "@/auth";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFound = () => new Response("Media not found", { status: 404 });

export async function GET(_request, { params }) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "chat", "view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { messageId } = await params;
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { channel: true, metadata: true, externalMessageId: true, conversation: { select: { externalUserId: true } } },
  });
  const mediaId = message?.metadata?.image?.mediaId;
  if (!message || !["WHATSAPP", "TIKTOK"].includes(message.channel) || !mediaId) return notFound();

  try {
    const setting = await prisma.chatSetting.findUnique({
      where: { id: "primary" },
      select: { encryptedCredentials: true },
    });
    const credentials = setting?.encryptedCredentials
      ? decryptProviderCredentials(setting.encryptedCredentials)
      : {};
    if (message.channel === "TIKTOK") {
      if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId || !message.externalMessageId) return new Response("TikTok media is not configured", { status: 503 });
      const params = new URLSearchParams({ business_id: credentials.tiktokBusinessId, conversation_id: message.conversation.externalUserId, message_id: message.externalMessageId, media_id: String(mediaId), media_type: "IMAGE" });
      const mediaResponse = await fetch(`https://business-api.tiktok.com/open_api/v1.3/business/message/media/download/?${params}`, {
        headers: { "Access-Token": credentials.tiktokAccessToken }, cache: "no-store", signal: AbortSignal.timeout(10000),
      });
      const media = await mediaResponse.json().catch(() => ({}));
      const mediaUrl = media.data?.download_url;
      if (!mediaResponse.ok || media.code !== 0 || !mediaUrl) return notFound();
      let safeUrl;
      try { safeUrl = new URL(mediaUrl); } catch { return notFound(); }
      if (safeUrl.protocol !== "https:" || !/(^|\.)tiktokcdn\.com$|(^|\.)tiktokv\.com$/i.test(safeUrl.hostname)) return notFound();
      const imageResponse = await fetch(safeUrl, { headers: { "x-user": credentials.tiktokAccessToken }, cache: "no-store", signal: AbortSignal.timeout(15000) });
      const contentType = imageResponse.headers.get("content-type") || "image/jpeg";
      if (!imageResponse.ok || !/^image\/(jpeg|png|webp)$/i.test(contentType)) return notFound();
      const image = await imageResponse.arrayBuffer();
      if (image.byteLength > 12 * 1024 * 1024) return new Response("Image is too large", { status: 413 });
      return new Response(image, { headers: { "Content-Type": contentType, "Content-Length": String(image.byteLength), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    if (!credentials.whatsappAccessToken || !/^v\d+\.\d+$/.test(version || "")) {
      return new Response("WhatsApp media is not configured", { status: 503 });
    }

    const mediaResponse = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(mediaId)}?fields=url,mime_type`,
      {
        headers: { Authorization: `Bearer ${credentials.whatsappAccessToken}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!mediaResponse.ok) return notFound();
    const media = await mediaResponse.json();
    let mediaUrl;
    try { mediaUrl = new URL(media.url); } catch { return notFound(); }
    if (mediaUrl.protocol !== "https:" || !/(^|\.)fbsbx\.com$|(^|\.)fbcdn\.net$/i.test(mediaUrl.hostname) || !String(media.mime_type || "").startsWith("image/") || media.mime_type === "image/svg+xml") {
      return notFound();
    }

    const imageResponse = await fetch(mediaUrl, {
      headers: { Authorization: `Bearer ${credentials.whatsappAccessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const contentType = imageResponse.headers.get("content-type") || media.mime_type;
    if (!imageResponse.ok || !contentType.startsWith("image/") || contentType.includes("svg")) {
      return notFound();
    }
    const image = await imageResponse.arrayBuffer();
    if (image.byteLength > 12 * 1024 * 1024) {
      return new Response("Image is too large", { status: 413 });
    }
    return new Response(image, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Unable to load WhatsApp media", { status: 502 });
  }
}
