import { auth } from "@/auth";
import { decryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFound = () => new Response("Media not found", { status: 404 });
const AUDIO_MAX_BYTES = 20 * 1024 * 1024;
const AUDIO_MEDIA_HOSTS = ["fbcdn.net", "fbsbx.com", "cdninstagram.com", "facebook.com", "tiktokcdn.com", "tiktokv.com"];

function isAllowedMediaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && AUDIO_MEDIA_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

async function returnAudio(response, fallbackMimeType = "audio/mpeg") {
  if (!response.ok || !response.body) return notFound();
  const contentType = (response.headers.get("content-type") || fallbackMimeType).split(";")[0].toLowerCase();
  if (!contentType.startsWith("audio/")) return notFound();
  const size = Number(response.headers.get("content-length")) || 0;
  if (size > AUDIO_MAX_BYTES) return new Response("Audio is too large", { status: 413 });
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > AUDIO_MAX_BYTES) {
      await reader.cancel();
      return new Response("Audio is too large", { status: 413 });
    }
    chunks.push(Buffer.from(value));
  }
  const audio = Buffer.concat(chunks, total);
  return new Response(audio, { headers: { "Content-Type": contentType, "Content-Length": String(audio.byteLength), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Accept-Ranges": "none" } });
}

export async function GET(request, { params }) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "chatInbox", "view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const { messageId } = await params;
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { channel: true, metadata: true, externalMessageId: true, conversation: { select: { externalUserId: true } } },
  });
  const query = new URL(request.url).searchParams;
  if (query.get("type") === "audio") {
    const audio = message?.metadata?.audio || null;
    const attachment = (message?.metadata?.attachments || []).find((item) => String(item?.type || "").toLowerCase() === "audio");
    const audioUrl = audio?.url || attachment?.payload?.url || attachment?.url;
    const audioMediaId = audio?.mediaId || audio?.media_id;
    if (!message || !["WHATSAPP", "MESSENGER", "INSTAGRAM", "TIKTOK"].includes(message.channel) || (!audioUrl && !audioMediaId)) return notFound();
    try {
      const setting = await prisma.chatSetting.findUnique({ where: { id: "primary" }, select: { encryptedCredentials: true } });
      const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
      let mediaUrl = audioUrl;
      let accessToken = "";
      let fallbackMimeType = audio?.mimeType || audio?.mime_type || attachment?.payload?.mime_type || attachment?.mime_type || "audio/mpeg";

      if (audioMediaId && message.channel === "WHATSAPP") {
        const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
        accessToken = credentials.whatsappAccessToken;
        if (!accessToken || !/^v\d+\.\d+$/.test(version || "")) return new Response("WhatsApp audio is not configured", { status: 503 });
        const infoResponse = await fetch(`https://graph.facebook.com/${version}/${encodeURIComponent(audioMediaId)}?fields=url,mime_type`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(10000) });
        const info = await infoResponse.json().catch(() => ({}));
        if (!infoResponse.ok || !info.url || !isAllowedMediaUrl(info.url)) return notFound();
        mediaUrl = info.url;
        fallbackMimeType = info.mime_type || fallbackMimeType;
      } else if (audioMediaId && message.channel === "TIKTOK") {
        if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId || !message.externalMessageId) return new Response("TikTok audio is not configured", { status: 503 });
        const mediaParams = new URLSearchParams({ business_id: credentials.tiktokBusinessId, conversation_id: message.conversation.externalUserId, message_id: message.externalMessageId, media_id: String(audioMediaId), media_type: "AUDIO" });
        const infoResponse = await fetch(`https://business-api.tiktok.com/open_api/v1.3/business/message/media/download/?${mediaParams}`, { headers: { "Access-Token": credentials.tiktokAccessToken }, cache: "no-store", signal: AbortSignal.timeout(10000) });
        const info = await infoResponse.json().catch(() => ({}));
        if (!infoResponse.ok || info.code !== 0 || !isAllowedMediaUrl(info.data?.download_url)) return notFound();
        mediaUrl = info.data.download_url;
        accessToken = credentials.tiktokAccessToken;
      }

      if (!isAllowedMediaUrl(mediaUrl)) return notFound();
      const mediaResponse = await fetch(mediaUrl, { ...(accessToken && { headers: message.channel === "TIKTOK" ? { "x-user": accessToken } : { Authorization: `Bearer ${accessToken}` } }), redirect: "error", cache: "no-store", signal: AbortSignal.timeout(20000) });
      return await returnAudio(mediaResponse, fallbackMimeType);
    } catch {
      return new Response("Unable to load audio", { status: 502 });
    }
  }
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
