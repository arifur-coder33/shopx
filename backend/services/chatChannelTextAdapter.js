import { getSiteUrl } from "@/lib/siteUrl";
import sharp from "sharp";
import { whatsAppImageContent, whatsAppUrlButtonContent } from "@/backend/utils/chatProductSelection.mjs";
import { ensureMessengerPostbacks } from "@/backend/services/chatMessengerSubscriptions.mjs";

export function buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId = null, quickReplies = [], urlButton = null) {
  const text = String(content || "").slice(0, conversation.channel === "WHATSAPP" ? 4096 : 2000);
  if (conversation.channel === "WEBSITE") return null;
  if (["WHATSAPP", "MESSENGER", "INSTAGRAM"].includes(conversation.channel)) {
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    const isWhatsApp = conversation.channel === "WHATSAPP";
    const isInstagram = conversation.channel === "INSTAGRAM";
    const token = isWhatsApp ? credentials.whatsappAccessToken : isInstagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
    const resource = isWhatsApp ? credentials.whatsappPhoneNumberId : isInstagram ? credentials.instagramAccountId : credentials.messengerPageId;
    if (!token || !resource || !/^v\d+\.\d+$/.test(version || "")) throw new Error("এই channel-এর reply credentials configure করা নেই।");
    const reply = replyToExternalMessageId ? { reply_to: { mid: replyToExternalMessageId } } : {};
    const payload = isWhatsApp
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, ...(replyToExternalMessageId && { context: { message_id: replyToExternalMessageId } }),
          ...(urlButton ? whatsAppUrlButtonContent(text, urlButton) : quickReplies.length > 0 && quickReplies.length <= 3 && text.length <= 1024 ? {
            type: "interactive", interactive: { type: "button", body: { text }, action: { buttons: quickReplies.map((option) => ({ type: "reply", reply: {
              id: String(typeof option === "string" ? option : option.payload).slice(0, 256), title: String(typeof option === "string" ? option : option.title).slice(0, 20),
            } })) } },
          } : quickReplies.length > 3 && quickReplies.length <= 10 && text.length <= 1024 ? {
            type: "interactive", interactive: { type: "list", body: { text }, action: { button: "বেছে নিন", sections: [{ rows: quickReplies.map((option) => ({
              id: String(typeof option === "string" ? option : option.payload).slice(0, 200), title: String(typeof option === "string" ? option : option.title).slice(0, 24),
            })) }] } },
          } : { type: "text", text: { body: text, preview_url: true } }),
        }
      : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...reply, message: { text, ...(conversation.channel === "MESSENGER" && quickReplies.length && { quick_replies: quickReplies.slice(0, 10).map((option) => ({ content_type: "text", title: String(typeof option === "string" ? option : option.title).slice(0, 20), payload: String(typeof option === "string" ? option : option.payload).slice(0, 1000) })) }) } };
    if (conversation.channel === "MESSENGER" && urlButton) {
      const buttons = (Array.isArray(urlButton) ? urlButton : [urlButton]).slice(0, 3);
      payload.message = { attachment: { type: "template", payload: {
        template_type: "button", text: text.slice(0, 640),
        buttons: buttons.map((button) => {
          const target = new URL(button.url);
          if (target.protocol !== "https:") throw new Error("URL buttons require HTTPS.");
          return { type: "web_url", title: String(button.title).slice(0, 20), url: target.href };
        }),
      } } };
    }
    return {
      provider: isWhatsApp ? "WHATSAPP" : "META",
      url: `https://graph.facebook.com/${version}/${resource}/messages`,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: payload,
    };
  }
  if (conversation.channel === "TIKTOK") {
    if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId) throw new Error("TikTok Business Messaging credentials configure করা হয়নি।");
    return {
      provider: "TIKTOK",
      url: "https://business-api.tiktok.com/open_api/v1.3/business/message/send/",
      headers: { "Access-Token": credentials.tiktokAccessToken, "Content-Type": "application/json" },
      body: {
        business_id: credentials.tiktokBusinessId,
        recipient_type: "CONVERSATION",
        recipient: conversation.externalUserId,
        message_type: "TEXT",
        text: { body: text },
        ...(replyToExternalMessageId && { referenced_message_info: { referenced_message_id: replyToExternalMessageId } }),
      },
    };
  }
  throw new Error("এই chat channel-এ text reply supported নয়।");
}

async function sendWhatsAppApprovedTemplate(conversation, templateName, language, content, credentials, imageUrl = null) {
  if (conversation.channel !== "WHATSAPP" || !templateName) throw new Error("WhatsApp approved template is not configured.");
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  const resource = credentials.whatsappPhoneNumberId;
  if (!credentials.whatsappAccessToken || !resource || !/^v\d+\.\d+$/.test(version || "")) throw new Error("WhatsApp reply credentials configure করা নেই।");
  const components = [];
  if (imageUrl) components.push({ type: "header", parameters: [{ type: "image", image: { link: imageUrl } }] });
  components.push({ type: "body", parameters: [{ type: "text", text: String(content || "").slice(0, 1024) || "পণ্যের তথ্য" }] });
  const response = await fetch(`https://graph.facebook.com/${version}/${resource}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.whatsappAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, type: "template", template: { name: templateName, language: { code: language || "bn" }, components } }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.error?.message || "WhatsApp approved template পাঠানো যায়নি।");
    error.code = result?.error?.code || `meta_http_${response.status}`;
    throw error;
  }
  return { id: result?.messages?.[0]?.id || null, secondaryIds: [], warning: null };
}

export async function sendChatChannelTextMessage(conversation, content, credentials, replyToExternalMessageId = null, quickReplies = [], urlButton = null) {
  const request = buildChatTextRequest(conversation, content, credentials, replyToExternalMessageId, quickReplies, urlButton);
  if (!request) return { id: null, secondaryIds: [], warning: null };
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (request.provider === "TIKTOK") {
    if (!response.ok || result.code !== 0) {
      const error = new Error(result.message || "TikTok message পাঠানো যায়নি।");
      error.code = result.code || `tiktok_http_${response.status}`;
      throw error;
    }
    return { id: result.data?.message_id || null, secondaryIds: [], warning: null };
  }
  if (!response.ok) {
    if (request.provider === "WHATSAPP" && Number(result?.error?.code) === 131047 && credentials.whatsappTextTemplateName) {
      const delivered = await sendWhatsAppApprovedTemplate(conversation, credentials.whatsappTextTemplateName, credentials.whatsappTemplateLanguage, content, credentials);
      credentials.whatsappWindowClosed = true;
      return delivered;
    }
    const error = new Error(result?.error?.message || "Meta message পাঠানো যায়নি।");
    error.code = result?.error?.code || `meta_http_${response.status}`;
    throw error;
  }
  return { id: request.provider === "WHATSAPP" ? result?.messages?.[0]?.id || null : result?.message_id || null, secondaryIds: [], warning: null };
}

export async function sendMessengerProductCard(conversation, product, credentials) {
  if (conversation.channel !== "MESSENGER") throw new Error("Messenger product card requires a Messenger conversation.");
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!credentials.messengerPageAccessToken || !credentials.messengerPageId || !/^v\d+\.\d+$/.test(version || "")) throw new Error("Messenger credentials configure করা নেই।");
  const subscription = await ensureMessengerPostbacks(credentials);
  const prices = product.variants.map((variant) => Number(variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice)).filter((value) => value > 0);
  const priceText = prices.length ? `৳${Math.min(...prices).toLocaleString("en-BD")}${Math.max(...prices) !== Math.min(...prices) ? `–৳${Math.max(...prices).toLocaleString("en-BD")}` : ""}` : "দাম জানতে লিখুন";
  const variants = product.variants.slice(0, 3).map((variant) => variant.options.join(" / ")).filter(Boolean).join(" · ");
  const element = {
    title: String(product.title).slice(0, 80),
    subtitle: [priceText, variants || product.features.slice(0, 2).join(" · ")].filter(Boolean).join(" · ").slice(0, 80),
    ...(product.imageUrls?.[0] && { image_url: product.imageUrls[0] }),
    buttons: [
      { type: "web_url", url: product.url, title: "পণ্য দেখুন" },
      { type: "postback", title: "এটি বেছে নিন", payload: `select:${product.id}` },
      { type: "postback", title: "অর্ডার করতে চাই", payload: `order:${product.id}` },
    ],
  };
  const response = await fetch(`https://graph.facebook.com/${version}/${credentials.messengerPageId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "generic", elements: [element] } } } }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "Messenger product card পাঠানো যায়নি।");
  const fallback = !subscription.ready ? await sendChatChannelTextMessage(conversation, "পণ্যটি সম্পর্কে জানতে বা অর্ডার করতে বেছে নিন।", credentials, null, [
    { title: "এটি বেছে নিন", payload: `select:${product.id}` },
    { title: "অর্ডার করতে চাই", payload: `order:${product.id}` },
  ]) : null;
  return { id: result.message_id || null, secondaryIds: fallback?.id ? [fallback.id] : [], warning: subscription.warning };
}

export async function sendMessengerProductCarousel(conversation, products, credentials, seeMoreUrl = null) {
  if (conversation.channel !== "MESSENGER") throw new Error("Messenger carousel requires a Messenger conversation.");
  if (products.length < 2) throw new Error("Messenger carousel needs at least two products.");
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!credentials.messengerPageAccessToken || !credentials.messengerPageId || !/^v\d+\.\d+$/.test(version || "")) throw new Error("Messenger credentials configure করা নেই।");
  const subscription = await ensureMessengerPostbacks(credentials);
  const elements = products.slice(0, seeMoreUrl ? 9 : 10).map((product) => {
    const prices = product.variants.map((variant) => Number(variant.currentCampaignPrice || variant.listedPrice || variant.regularPrice)).filter((value) => value > 0);
    const priceText = prices.length ? `৳${Math.min(...prices).toLocaleString("en-BD")}${Math.max(...prices) !== Math.min(...prices) ? `–৳${Math.max(...prices).toLocaleString("en-BD")}` : ""}` : "দাম জানতে লিখুন";
    const variants = product.variants.slice(0, 3).map((variant) => variant.options.join(" / ")).filter(Boolean).join(" · ");
    return {
      title: String(product.title).slice(0, 80),
      subtitle: [priceText, variants || product.features.slice(0, 2).join(" · ")].filter(Boolean).join(" · ").slice(0, 80),
      ...(product.imageUrls?.[0] && { image_url: product.imageUrls[0] }),
      buttons: [
        { type: "web_url", url: product.url, title: "পণ্য দেখুন" },
        { type: "postback", title: "এটি বেছে নিন", payload: `select:${product.id}` },
        { type: "postback", title: "অর্ডার করতে চাই", payload: `order:${product.id}` },
      ],
    };
  });
  if (seeMoreUrl) elements.push({
    title: "আরও পণ্য দেখুন",
    subtitle: "বাকি সার্চ রেজাল্ট দেখতে চাপুন",
    buttons: [{ type: "web_url", url: seeMoreUrl, title: "আরও দেখুন" }],
  });
  const response = await fetch(`https://graph.facebook.com/${version}/${credentials.messengerPageId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "generic", elements } } } }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "Messenger product carousel পাঠানো যায়নি।");
  const fallback = !subscription.ready ? await sendChatChannelTextMessage(conversation, "কোন পণ্যটি সম্পর্কে জানতে চান?", credentials, null,
    products.slice(0, 10).map((product, index) => ({ title: `${index + 1}. ${product.title}`.slice(0, 20), payload: `select:${product.id}` }))) : null;
  return { id: result.message_id || null, secondaryIds: fallback?.id ? [fallback.id] : [], warning: subscription.warning };
}

export async function sendChatChannelImageMessage(conversation, caption, imageUrl, credentials, replyToExternalMessageId = null, selectionProductId = null, imageBytes = null) {
  const url = new URL(imageUrl);
  if (url.protocol !== "https:") throw new Error("Product photo URL must use HTTPS.");
  if (conversation.channel === "WEBSITE") return { id: null, secondaryIds: [], warning: null };
  if (["WHATSAPP", "MESSENGER", "INSTAGRAM"].includes(conversation.channel)) {
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    const isWhatsApp = conversation.channel === "WHATSAPP";
    const isInstagram = conversation.channel === "INSTAGRAM";
    const token = isWhatsApp ? credentials.whatsappAccessToken : isInstagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
    const resource = isWhatsApp ? credentials.whatsappPhoneNumberId : isInstagram ? credentials.instagramAccountId : credentials.messengerPageId;
    if (!token || !resource || !/^v\d+\.\d+$/.test(version || "")) throw new Error("এই channel-এর reply credentials configure করা নেই।");
    const endpoint = `https://graph.facebook.com/${version}/${resource}/messages`;
    if (isWhatsApp) {
      if (credentials.whatsappWindowClosed && credentials.whatsappImageTemplateName) {
        const delivered = await sendWhatsAppApprovedTemplate(conversation, credentials.whatsappImageTemplateName, credentials.whatsappTemplateLanguage, caption || "পণ্যের ছবি", credentials, imageUrl);
        return delivered;
      }
      const siteHost = new URL(await getSiteUrl()).hostname.toLowerCase().replace(/^www\./u, "");
      const imageHost = url.hostname.toLowerCase().replace(/^www\./u, "");
      const isCloudinary = imageHost === "cloudinary.com" || imageHost.endsWith(".cloudinary.com");
      if (imageHost !== siteHost && !isCloudinary) throw new Error("WhatsApp-এ পাঠানোর ছবিটি আমাদের site বা Cloudinary থেকে হতে হবে।");

      const sourceResponse = imageBytes ? new Response(imageBytes, { headers: { "Content-Type": "image/png" } }) : await fetch(url, {
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const sourceType = sourceResponse.headers.get("content-type")?.split(";")[0]?.toLowerCase() || "";
      const sourceLength = Number(sourceResponse.headers.get("content-length")) || 0;
      if (!sourceResponse.ok || !sourceType.startsWith("image/") || sourceLength > 15 * 1024 * 1024)
        throw new Error("Product image download failed or exceeded the size limit.");
      const sourceBytes = Buffer.from(await sourceResponse.arrayBuffer());
      if (!sourceBytes.length || sourceBytes.length > 15 * 1024 * 1024)
        throw new Error("Product image is empty or exceeded the size limit.");

      let jpeg = await sharp(sourceBytes, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      if (jpeg.length > 5 * 1024 * 1024) {
        jpeg = await sharp(sourceBytes, { limitInputPixels: 40_000_000 })
          .rotate()
          .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 65, mozjpeg: true })
          .toBuffer();
      }
      if (jpeg.length > 5 * 1024 * 1024) throw new Error("Image could not be compressed below WhatsApp's 5 MB limit.");

      const uploadForm = new FormData();
      uploadForm.set("messaging_product", "whatsapp");
      uploadForm.set("type", "image/jpeg");
      uploadForm.set("file", new Blob([jpeg], { type: "image/jpeg" }), "product.jpg");
      const uploadResponse = await fetch(`https://graph.facebook.com/${version}/${resource}/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      });
      const uploadResult = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadResult.id) {
        const error = new Error(uploadResult?.error?.message || "WhatsApp media upload failed.");
        error.code = uploadResult?.error?.code || `meta_media_http_${uploadResponse.status}`;
        throw error;
      }

      const sendResponse = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: conversation.externalUserId,
          ...(replyToExternalMessageId && { context: { message_id: replyToExternalMessageId } }),
          ...whatsAppImageContent(uploadResult.id, caption, selectionProductId),
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const sendResult = await sendResponse.json().catch(() => ({}));
      if (!sendResponse.ok) {
        if (Number(sendResult?.error?.code) === 131047 && credentials.whatsappImageTemplateName) {
          const delivered = await sendWhatsAppApprovedTemplate(conversation, credentials.whatsappImageTemplateName, credentials.whatsappTemplateLanguage, caption || "পণ্যের ছবি", credentials, imageUrl);
          credentials.whatsappWindowClosed = true;
          return delivered;
        }
        const error = new Error(sendResult?.error?.message || "WhatsApp image message could not be sent.");
        error.code = sendResult?.error?.code || `meta_http_${sendResponse.status}`;
        throw error;
      }
      return { id: sendResult?.messages?.[0]?.id || null, secondaryIds: [], warning: null };
    }

    const body = {
      recipient: { id: conversation.externalUserId },
      messaging_type: "RESPONSE",
      ...(replyToExternalMessageId && {
        reply_to: { mid: replyToExternalMessageId },
      }),
      message: {
        attachment: {
          type: "image",
          payload: { url: imageUrl, is_reusable: true },
        },
      },
    };
    let upload;
    if (imageBytes && conversation.channel === "MESSENGER") {
      const jpeg = await sharp(imageBytes).jpeg({ quality: 88 }).toBuffer();
      upload = new FormData();
      upload.set("recipient", JSON.stringify(body.recipient));
      upload.set("messaging_type", "RESPONSE");
      upload.set("message", JSON.stringify({ attachment: { type: "image", payload: { is_reusable: true } } }));
      upload.set("filedata", new Blob([jpeg], { type: "image/jpeg" }), "order-confirmation.jpg");
    }
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, ...(!upload && { "Content-Type": "application/json" }) }, body: upload || JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(20000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(result?.error?.message || "Product photo পাঠানো যায়নি।"); error.code = result?.error?.code || `meta_http_${response.status}`; throw error; }
    const id = isWhatsApp ? result?.messages?.[0]?.id || null : result?.message_id || null;
    const secondaryIds = [];
    let warning = null;
    if (!isWhatsApp && caption.trim()) {
      const captionResponse = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...(replyToExternalMessageId && { reply_to: { mid: replyToExternalMessageId } }), message: { text: caption.slice(0, 700) } }), cache: "no-store", signal: AbortSignal.timeout(15000) });
      const captionResult = await captionResponse.json().catch(() => ({}));
      if (captionResponse.ok && captionResult.message_id) secondaryIds.push(captionResult.message_id);
      else warning = captionResult?.error?.message || "Photo গেছে, তবে caption পাঠানো যায়নি।";
    }
    return { id, secondaryIds, warning };
  }
  if (conversation.channel === "TIKTOK") {
    if (!/^([a-z0-9-]+\.)*cloudinary\.com$/i.test(url.hostname)) throw new Error("TikTok-এ পাঠানোর photo Media Library-তে থাকতে হবে।");
    if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId) throw new Error("TikTok Business Messaging credentials configure করা হয়নি।");
    const source = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
    const mimeType = source.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    if (!source.ok || !["image/jpeg", "image/png"].includes(mimeType)) throw new Error("TikTok-এ JPG অথবা PNG photo পাঠানো যাবে।");
    const bytes = await source.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 3 * 1024 * 1024) throw new Error("TikTok photo সর্বোচ্চ 3 MB হতে পারে।");
    const form = new FormData(); form.set("business_id", credentials.tiktokBusinessId); form.set("media_type", "IMAGE"); form.set("file", new Blob([bytes], { type: mimeType }), mimeType === "image/png" ? "product.png" : "product.jpg");
    const uploadResponse = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/media/upload/", { method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken }, body: form, cache: "no-store" });
    const upload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok || upload.code !== 0 || !upload.data?.media_id) throw new Error(upload.message || "TikTok-এ photo upload করা যায়নি।");
    const send = async (body) => {
      const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/send/", { method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken, "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.code !== 0) throw new Error(result.message || "TikTok message পাঠানো যায়নি।");
      return result.data?.message_id || null;
    };
    const base = { business_id: credentials.tiktokBusinessId, recipient_type: "CONVERSATION", recipient: conversation.externalUserId };
    const id = await send({ ...base, message_type: "IMAGE", image: { media_id: upload.data.media_id } });
    const secondaryIds = caption.trim() ? [await send({ ...base, message_type: "TEXT", text: { body: caption.slice(0, 700) }, ...(replyToExternalMessageId && { referenced_message_info: { referenced_message_id: replyToExternalMessageId } }) })].filter(Boolean) : [];
    return { id, secondaryIds, warning: null };
  }
  throw new Error("এই chat channel-এ photo reply supported নয়.");
}
