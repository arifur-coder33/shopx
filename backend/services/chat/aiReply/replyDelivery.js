/**
 * Chat AI reply: Sends generated text, product cards, and media to the selected channel.
 * Keep this module focused on one step of the reply pipeline.
 */
import prisma from "@/lib/prisma";
import { isAiReplyEnabledForChannel, settingId } from "./foundation.js";
import { sendChatChannelImageMessage, sendChatChannelTextMessage, sendMessengerProductCard, sendMessengerProductCarousel } from "@/backend/services/chatChannelTextAdapter";

export async function deliverReply(
  conversation,
  content,
  credentials,
  products = [],
  mediaPhoto = null,
  videoLinks = [],
  mediaPhotos = [],
  seeMoreUrl = null,
) {
  if (conversation.channel === "WEBSITE")
    return { id: null, imageWarnings: [], mediaMessages: [] };

  const sent = [];
  const mediaMessages = [];

  // ১. মূল চ্যাট টেক্সট পাঠানো
  if (content.trim()) {
    try {
      sent.push(
        await sendChatChannelTextMessage(
          conversation,
          videoLinks.length ? content.split("\n")[0] : content,
          credentials,
        ),
      );
    } catch (error) {
      const hasImageFollowup = Boolean(
        credentials.whatsappImageTemplateName &&
        (products.some((product) => product.imageUrls?.[0]) ||
          mediaPhoto?.url ||
          mediaPhotos.length),
      );
      if (
        conversation.channel !== "WHATSAPP" ||
        Number(error?.code) !== 131047 ||
        !hasImageFollowup
      )
        throw error;
      credentials.whatsappWindowClosed = true;
    }
  }

  // ২. ভিডিও লিংক থাকলে পাঠানো
  for (const video of videoLinks) {
    const videoText = `${video.header}: ${video.url}`;
    const result = await sendChatChannelTextMessage(
      conversation,
      videoText,
      credentials,
    );
    sent.push(result);
    mediaMessages.push({ id: result.id, content: videoText });
  }

  const imageWarnings = [];

  // ৩. স্পেসিফিক ফটো রিকোয়েস্ট থাকলে পাঠানো
  const photosToSend = mediaPhotos.length
    ? mediaPhotos
    : mediaPhoto?.url
      ? [mediaPhoto]
      : [];
  for (const photo of photosToSend) {
    try {
      const result = await sendChatChannelImageMessage(
        conversation,
        "",
        photo.url,
        credentials,
      );
      sent.push(result);
      mediaMessages.push({
        id: result.id,
        content: "📷 পণ্যের ছবি",
        image: photo,
      });
    } catch (error) {
      console.error(
        "WhatsApp/Channel product photo send failed:",
        error?.message || error,
      );
      imageWarnings.push({
        productId: photo.productId,
        code: String(error?.code || "image_send_failed").slice(0, 80),
      });
    }
  }

  // ৪. Messenger-এ একসঙ্গে horizontal carousel পাঠানো
  let messengerCarouselSent = false;
  if (conversation.channel === "MESSENGER" && products.length > 1) {
    try {
      const result = await sendMessengerProductCarousel(
        conversation,
        products,
        credentials,
        seeMoreUrl,
      );
      sent.push(result);
      mediaMessages.push({
        id: result.id,
        content: "পণ্যের সাজেশন",
        products,
        ...(seeMoreUrl && { seeMoreUrl }),
        ...(result.warning && { callbackWarning: result.warning }),
      });
      messengerCarouselSent = true;
    } catch (error) {
      console.warn(
        "Messenger carousel failed; falling back to separate cards:",
        error?.message || error,
      );
    }
  }

  // ৫. অন্য চ্যানেল বা carousel failure হলে আলাদা product card
  for (const product of messengerCarouselSent ? [] : products) {
    // মেসেঞ্জারের জন্য আগের মতোই বাটনসহ কার্ড থাকবে
    if (conversation.channel === "MESSENGER") {
      try {
        const result = await sendMessengerProductCard(
          conversation,
          product,
          credentials,
        );
        sent.push(result);
        mediaMessages.push({ id: result.id, content: product.title, product, ...(result.warning && { callbackWarning: result.warning }) });
      } catch (error) {
        imageWarnings.push({
          productId: product.id,
          code: String(error?.code || "card_send_failed").slice(0, 80),
        });
        const fallback = `*${product.title}*\n\n🛒 বিস্তারিত দেখুন: ${product.url}\n👉 এখনই অর্ডার করুন: ${product.buyNowUrl}`;
        const result = await sendChatChannelTextMessage(
          conversation,
          fallback,
          credentials,
          null,
          [
            { title: "আরও জানতে চাই", payload: `details:${product.id}` },
            { title: "অর্ডার করতে চাই", payload: `order:${product.id}` },
          ],
        );
        sent.push(result);
        mediaMessages.push({ id: result.id, content: fallback });
      }
      continue;
    }

    // --- হোয়াটসঅ্যাপ (WHATSAPP) ও অন্যান্য চ্যানেলের জন্য বিশেষ ফরম্যাট ---
    const prices = product.variants
      .map(
        (variant) =>
          variant.currentCampaignPrice ||
          variant.listedPrice ||
          variant.regularPrice,
      )
      .filter((value) => Number(value) > 0)
      .map(Number);

    const priceText = prices.length
      ? `\n💰 *মূল্য:* ৳${Math.min(...prices).toLocaleString("en-BD")}${
          Math.max(...prices) !== Math.min(...prices)
            ? ` – ৳${Math.max(...prices).toLocaleString("en-BD")}`
            : ""
        }`
      : "";

    const featureLines = product.features
      .slice(0, 3)
      .map((f) => `✔ ${f}`)
      .join("\n");

    const isWhatsApp = conversation.channel === "WHATSAPP";
    const selectionReplies = isWhatsApp ? [{ title: "এটি বেছে নিন", payload: `select:${product.id}` }] : [];
    const captionLines = [
      `🛍️ *${product.title}*${priceText}`,
      featureLines ? `\n${featureLines}` : "",
      ...(!isWhatsApp ? [
        `\n🔗 *বিস্তারিত দেখুন:* ${product.url}`,
        `👉 *সরাসরি অর্ডার করতে ক্লিক করুন:* ${product.buyNowUrl}`,
      ] : []),
    ].filter(Boolean);

    const caption = captionLines.join("\n").slice(0, 950);

    // ইমেজ ইউআরএল ভ্যালিডেশন (হোয়াটসঅ্যাপের জন্য HTTPS বাধ্যতামূলক)
    let validImageUrl = null;
    if (product.imageUrls?.[0] && product.imageUrls[0].startsWith("https://")) {
      validImageUrl = product.imageUrls[0];
    }

    if (validImageUrl) {
      try {
        const result = await sendChatChannelImageMessage(
          conversation,
          caption,
          validImageUrl,
          credentials,
          null,
          product.id,
        );
        sent.push(result);
        mediaMessages.push({
          id: result.id,
          content: caption,
          image: {
            url: validImageUrl,
            productId: product.id,
            productTitle: product.title,
          },
        });
      } catch (error) {
        // হোয়াটসঅ্যাপে ছবি ফেইল করার আসল কারণ টার্মিনালে লগ হবে
        console.error("WhatsApp image delivery failed:", {
          productId: product.id,
          imageUrl: validImageUrl,
          error: error?.message || error,
        });

        imageWarnings.push({
          productId: product.id,
          code: String(error?.code || "image_send_failed").slice(0, 80),
        });

        // Keep product selection available even when its photo cannot be sent.
        const result = await sendChatChannelTextMessage(
          conversation,
          caption,
          credentials,
          null,
          selectionReplies,
        );
        sent.push(result);
        mediaMessages.push({ id: result.id, content: caption });
      }
    } else {
      // যদি ছবির লিংক ভ্যালিড না হয়, শুধু টেক্সট পাঠানো
      const result = await sendChatChannelTextMessage(
        conversation,
        caption,
        credentials,
        null,
        selectionReplies,
      );
      sent.push(result);
      mediaMessages.push({ id: result.id, content: caption });
    }
  }

  if (conversation.channel === "MESSENGER" && seeMoreUrl && !messengerCarouselSent) {
    const text = `আরও পণ্য দেখুন: ${seeMoreUrl}`;
    try {
      const result = await sendChatChannelTextMessage(conversation, text, credentials);
      sent.push(result);
      mediaMessages.push({ id: result.id, content: text, seeMoreUrl });
    } catch (error) {
      console.warn("Messenger see-more link failed:", error?.message || error);
    }
  }

  return {
    id: sent.find((result) => result.id)?.id || null,
    imageWarnings,
    mediaMessages,
  };
}

export async function stopForHumanTakeover(
  conversationId,
  inboundMessage,
  aiMessageId,
) {
  const [conversation, setting] = await Promise.all([
    prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { status: true, channel: true, aiModeEnabled: true, assignedToId: true, aiReplyLeaseToken: true },
    }),
    prisma.chatSetting.findUnique({
      where: { id: settingId },
      select: { aiAutoReplyEnabled: true, aiReplyWebsiteEnabled: true, aiReplyWhatsAppEnabled: true, aiReplyMessengerEnabled: true, aiReplyInstagramEnabled: true, aiReplyTikTokEnabled: true },
    }),
  ]);
  if (
    !setting?.aiAutoReplyEnabled ||
    !conversation ||
    !isAiReplyEnabledForChannel(setting, conversation.channel) ||
    conversation.status !== "OPEN" ||
    !conversation.aiModeEnabled ||
    conversation.assignedToId ||
    (inboundMessage.replyLeaseToken && conversation.aiReplyLeaseToken !== inboundMessage.replyLeaseToken)
  )
    return true;
  const agentReply = await prisma.chatMessage.findFirst({
    where: {
      conversationId,
      direction: "OUTBOUND",
      authorType: "AGENT",
      id: { not: aiMessageId },
      createdAt: { gt: inboundMessage.createdAt },
    },
    select: { id: true },
  });
  return Boolean(agentReply);
}
