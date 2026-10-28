"use server";

import { auth } from "@/auth";
import { decryptProviderCredentials, encryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getSiteUrl } from "@/lib/siteUrl";
import { groupChatInbox, normalizeChatPhone } from "@/lib/chatIdentity";
import { getOrderPushPublicKey, saveOrderPushSubscription, removeOrderPushSubscription } from "@/backend/services/orderPushService";
import { sendChatPushTestNotification } from "@/backend/services/chatPushService";
import { sendChatChannelTextMessage } from "@/backend/services/chatChannelTextAdapter";
import { isChatOrderCreationEnabled } from "@/backend/services/chatOrderSettings";
import { ensureMessengerPostbacks } from "@/backend/services/chatMessengerSubscriptions.mjs";
import { sendFacebookPageCommentPrivateReply } from "@/backend/services/facebookPageCommentReplyService";
import { messengerReaction, messengerReactionPayload } from "@/backend/utils/chatMessengerReaction.mjs";
import {
  DEFAULT_CHAT_AI_MODELS,
  isChatAiModelAllowed,
} from "@/backend/services/chatAiModels";
import { getMediaUsageIndex, syncLegacyChatMedia } from "@/backend/services/mediaUsageService";
import jwt from "jsonwebtoken";
import { cloudinaryDestroy, cloudinaryUpload } from "@/backend/utils/cloudinary";

const SETTING_ID = "primary";
const SECRET_KEYS = ["whatsappPhoneNumberId", "whatsappAccessToken", "messengerPageId", "messengerPageAccessToken", "instagramAccountId", "instagramAccessToken", "metaAppSecret", "webhookVerifyToken", "graphApiVersion", "tiktokBusinessId", "tiktokAccessToken", "tiktokClientKey", "tiktokClientSecret", "openaiApiKey", "googleAiStudioApiKey"];
const trim = (value) => String(value ?? "").trim();

export async function getFacebookPageCommentsAction({ limit = 100 } = {}) {
  try {
    await requireProcurementPermission("chat", "view");
    const rows = await prisma.facebookPageCommentReply.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 100, 1), 250),
      select: {
        id: true, commentId: true, pageId: true, postId: true, authorName: true,
        commentText: true, commentCreatedAt: true, replyText: true, status: true,
        errorCode: true, createdAt: true, repliedAt: true, privateReplyText: true,
        privateReplyAt: true, privateReplyStatus: true, privateReplyError: true,
      },
    });
    return { success: true, data: rows };
  } catch (error) { return actionError(error, "Facebook comment history load করা যায়নি।"); }
}

export async function sendFacebookPageCommentPrivateReplyAction(id, message) {
  try {
    await requireProcurementPermission("chat", "update");
    const safeId = trim(id);
    const safeMessage = trim(message);
    if (!safeId || !safeMessage || safeMessage.length > 1000) throw new Error("Inbox message 1–1000 অক্ষরের মধ্যে লিখুন।");
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    if (!credentials.messengerPageId || !credentials.messengerPageAccessToken) throw new Error("Chat Settings-এ Facebook Page ID ও Page Access Token configure করুন।");
    const data = await sendFacebookPageCommentPrivateReply({ id: safeId, message: safeMessage, credentials });
    revalidatePath("/admin/chat/comments");
    return { success: true, data };
  } catch (error) { return actionError(error, "Comment থেকে inbox reply পাঠানো যায়নি।"); }
}

export async function getChatAiTeachingsAction() {
  try {
    await requireProcurementPermission("chat", "view");
    const setting = await prisma.chatSetting.findUnique({ where: { id: SETTING_ID }, select: { aiReplyExamples: true } });
    const teachings = Array.isArray(setting?.aiReplyExamples) ? setting.aiReplyExamples.filter((item) => item?.question && item?.answer).map((item) => ({ question: String(item.question), answer: String(item.answer) })) : [];
    return { success: true, data: teachings };
  } catch (error) { return actionError(error, "AI Teach data load করা যায়নি।"); }
}

export async function saveChatAiTeachingsAction(teachings) {
  try {
    const userId = await requireProcurementPermission("chat", "update");
    if (!Array.isArray(teachings) || teachings.length > 40) throw new Error("সর্বোচ্চ ৪০টি teaching example রাখা যাবে।");
    const cleanTeachings = teachings.map((item) => ({
      question: String(item?.question || "").trim().replace(/[<>]/g, "").slice(0, 300),
      answer: String(item?.answer || "").trim().replace(/[<>]/g, "").slice(0, 500),
    })).filter((item) => item.question && item.answer);
    await prisma.chatSetting.upsert({
      where: { id: SETTING_ID },
      update: { aiReplyExamples: cleanTeachings, updatedBy: userId },
      create: { id: SETTING_ID, aiReplyExamples: cleanTeachings, createdBy: userId, updatedBy: userId },
    });
    revalidatePath("/admin/ai/teach");
    revalidatePath("/admin/ai/settings");
    revalidatePath("/admin/chat/settings");
    return { success: true, data: cleanTeachings, message: "AI teaching examples সংরক্ষণ হয়েছে।" };
  } catch (error) { return actionError(error, "AI teaching examples save করা যায়নি।"); }
}

export async function getChatPushConfigAction() {
  try {
    await requireProcurementPermission("chat", "view");
    return { success: true, publicKey: await getOrderPushPublicKey() };
  } catch (error) { return actionError(error, "Chat push configuration could not be loaded."); }
}

export async function saveChatPushSubscriptionAction(subscription) {
  try {
    const userId = await requireProcurementPermission("chat", "view");
    await saveOrderPushSubscription(userId, subscription);
    return { success: true };
  } catch (error) { return actionError(error, "Chat push subscription could not be saved."); }
}

export async function removeChatPushSubscriptionAction(endpoint) {
  try {
    const userId = await requireProcurementPermission("chat", "view");
    await removeOrderPushSubscription(userId, endpoint);
    return { success: true };
  } catch (error) { return actionError(error, "Chat push subscription could not be removed."); }
}

export async function sendChatPushTestAction(endpoint) {
  try {
    const userId = await requireProcurementPermission("chat", "view");
    const result = await sendChatPushTestNotification(userId, endpoint);
    return { success: true, ...result };
  } catch (error) { return actionError(error, "Test chat push could not be sent."); }
}

export async function getChatRealtimeTokenAction() {
  try {
    const userId = await requireProcurementPermission("chat", "view");
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Realtime authentication is not configured.");
    return {
      success: true,
      token: jwt.sign({ scope: "chat:realtime" }, secret, {
        subject: userId,
        audience: "shopzy-chat-realtime",
        issuer: "shopzy",
        expiresIn: "5m",
      }),
    };
  } catch (error) { return actionError(error, "Chat realtime connection could not be authenticated."); }
}

async function getSetting() {
  return prisma.chatSetting.findUnique({ where: { id: SETTING_ID } });
}

export async function setChatMessageReactionAction(messageId, emoji) {
  try {
    await requireProcurementPermission("chat", "update");
    const message = await prisma.chatMessage.findUnique({ where: { id: String(messageId) }, include: { conversation: true } });
    if (!message || message.channel !== "MESSENGER" || !message.externalMessageId) throw new Error("এই Messenger message-এ reaction দেওয়া যাচ্ছে না।");
    const reaction = messengerReaction(emoji);
    if (!reaction) throw new Error("এই reaction-টি supported নয়।");
    const reactionCode = reaction.code;
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    if (!version || !/^v\d+\.\d+$/.test(version)) throw new Error("Chat Settings-এ valid Meta Graph API version configure করুন।");
    if (!credentials.messengerPageAccessToken || !credentials.messengerPageId) throw new Error("Messenger credentials configure করা হয়নি।");

    const currentReactions = Array.isArray(message.metadata?.reactions) ? message.metadata.reactions : [];
    const existingAgentReaction = currentReactions.find((item) => item.actorType === "AGENT");
    const shouldRemove = existingAgentReaction?.code === reactionCode || messengerReaction(existingAgentReaction?.emoji)?.code === reactionCode;
    const payload = messengerReactionPayload(message.conversation.externalUserId, message.externalMessageId, reaction.emoji, shouldRemove);
    const response = await fetch(`https://graph.facebook.com/${version}/${credentials.messengerPageId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "Messenger reaction পাঠানো যায়নি।");

    const reactions = currentReactions.filter((item) => item.actorType !== "AGENT");
    if (!shouldRemove) reactions.push({ actorId: "PAGE", actorType: "AGENT", code: reactionCode, emoji: reaction.emoji });
    const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { metadata: { ...(message.metadata || {}), reactions } } });
    return { success: true, data: updated, removed: shouldRemove };
  } catch (error) { return actionError(error, "Messenger reaction পাঠানো যায়নি।"); }
}

export async function getChatSettingsAction() {
  try {
    await requireProcurementPermission("chat", "view");
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    return {
      success: true,
      data: {
        websiteChatEnabled: setting?.websiteChatEnabled ?? true,
        chatOrderCreationEnabled: isChatOrderCreationEnabled(setting),
        whatsappEnabled: setting?.whatsappEnabled ?? false,
        messengerEnabled: setting?.messengerEnabled ?? false,
        facebookCommentAutoReplyEnabled: setting?.facebookCommentAutoReplyEnabled ?? false,
        instagramEnabled: setting?.instagramEnabled ?? false,
        tiktokEnabled: setting?.tiktokEnabled ?? false,
        aiAutoReplyEnabled: setting?.aiAutoReplyEnabled ?? false,
        aiProvider: setting?.aiProvider === "GOOGLE_AI_STUDIO" ? "GOOGLE_AI_STUDIO" : "OPENAI",
        openaiModel: isChatAiModelAllowed("OPENAI", setting?.openaiModel)
          ? setting.openaiModel
          : DEFAULT_CHAT_AI_MODELS.OPENAI,
        googleAiStudioModel: isChatAiModelAllowed("GOOGLE_AI_STUDIO", setting?.googleAiStudioModel)
          ? setting.googleAiStudioModel
          : DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO,
        whatsappTextTemplateName: setting?.whatsappTextTemplateName || "",
        whatsappImageTemplateName: setting?.whatsappImageTemplateName || "",
        whatsappTemplateLanguage: setting?.whatsappTemplateLanguage || "bn",
        welcomeMessage: setting?.welcomeMessage || "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?",
        quickReplies: Array.isArray(setting?.quickReplies) ? setting.quickReplies.filter((item) => item?.shortcut && item?.text) : [],
        aiReplyTone: setting?.aiReplyTone || "বন্ধুসুলভ, স্বাভাবিক, সংক্ষিপ্ত এবং একজন local shop owner-এর মতো",
        aiReplyExamples: Array.isArray(setting?.aiReplyExamples) ? setting.aiReplyExamples : [],
        publicCredentials: {
          whatsappPhoneNumberId: credentials.whatsappPhoneNumberId || "",
          messengerPageId: credentials.messengerPageId || "",
          instagramAccountId: credentials.instagramAccountId || "",
          tiktokBusinessId: credentials.tiktokBusinessId || "",
          tiktokClientKey: credentials.tiktokClientKey || "",
          graphApiVersion: credentials.graphApiVersion || "",
        },
        configured: Object.fromEntries(SECRET_KEYS.map((key) => [key, Boolean(credentials[key])])),
      },
    };
  } catch (error) {
    return actionError(error, "Chat settings could not be loaded.");
  }
}

export async function revealChatCredentialAction(key) {
  try {
    await requireProcurementPermission("chat", "update");
    if (!SECRET_KEYS.includes(key)) throw new Error("Invalid credential field.");
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    if (!credentials[key]) return { success: false, message: "এই credential সংরক্ষিত নেই।" };
    return { success: true, data: { value: credentials[key] } };
  } catch (error) { return actionError(error, "Credential could not be revealed."); }
}

export async function saveChatSettingsAction(formData) {
  try {
    const userId = await requireProcurementPermission("chat", "update");
    const existing = await getSetting();
    const credentials = existing?.encryptedCredentials ? decryptProviderCredentials(existing.encryptedCredentials) : {};
    for (const key of SECRET_KEYS) {
      if (formData.get(`clear_${key}`) === "true") delete credentials[key];
      else if (trim(formData.get(key))) credentials[key] = trim(formData.get(key));
    }
    const websiteChatEnabled = formData.get("websiteChatEnabled") === "on";
    const chatOrderCreationEnabled = formData.get("chatOrderCreationEnabled") === "on";
    const whatsappEnabled = formData.get("whatsappEnabled") === "on";
    const messengerEnabled = formData.get("messengerEnabled") === "on";
    const facebookCommentAutoReplyEnabled = formData.get("facebookCommentAutoReplyEnabled") === "on";
    const instagramEnabled = formData.get("instagramEnabled") === "on";
    const tiktokEnabled = formData.get("tiktokEnabled") === "on";
    const aiAutoReplyEnabled = formData.get("aiAutoReplyEnabled") === "on";
    const aiProvider = trim(formData.get("aiProvider")) || "OPENAI";
    if (!["OPENAI", "GOOGLE_AI_STUDIO"].includes(aiProvider)) throw new Error("AI provider নির্বাচনটি সঠিক নয়।");
    const openaiModel = trim(formData.get("openaiModel")) || DEFAULT_CHAT_AI_MODELS.OPENAI;
    const googleAiStudioModel = trim(formData.get("googleAiStudioModel")) || DEFAULT_CHAT_AI_MODELS.GOOGLE_AI_STUDIO;
    const whatsappTextTemplateName = trim(formData.get("whatsappTextTemplateName")).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 512) || null;
    const whatsappImageTemplateName = trim(formData.get("whatsappImageTemplateName")).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 512) || null;
    const whatsappTemplateLanguage = trim(formData.get("whatsappTemplateLanguage")).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 35) || "bn";
    if (!isChatAiModelAllowed("OPENAI", openaiModel)) throw new Error("OpenAI model নির্বাচনটি সঠিক নয়।");
    if (!isChatAiModelAllowed("GOOGLE_AI_STUDIO", googleAiStudioModel)) throw new Error("Google AI model নির্বাচনটি সঠিক নয়।");
    const welcomeMessage = trim(formData.get("welcomeMessage")).slice(0, 300) || "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?";
    const quickReplies = String(formData.get("quickReplies") || "").split("\n").map((line) => {
      const separator = line.indexOf("=");
      if (separator < 1) return null;
      const shortcut = line.slice(0, separator).trim().replace(/^\//, "").slice(0, 40);
      const text = line.slice(separator + 1).trim().slice(0, 500);
      return shortcut && text ? { shortcut, text } : null;
    }).filter(Boolean).slice(0, 50);
    quickReplies.push({ __chatOrderConfig: true, enabled: chatOrderCreationEnabled });
    const aiReplyTone = trim(formData.get("aiReplyTone")).replace(/[<>]/g, "").slice(0, 500) || "বন্ধুসুলভ, স্বাভাবিক, সংক্ষিপ্ত এবং একজন local shop owner-এর মতো";
    const aiReplyExamples = String(formData.get("aiReplyExamples") || "").split(/\r?\n/).map((line) => {
      const separator = line.indexOf("=>");
      if (separator < 1) return null;
      const question = line.slice(0, separator).trim().replace(/[<>]/g, "").slice(0, 300);
      const answer = line.slice(separator + 2).trim().replace(/[<>]/g, "").slice(0, 500);
      return question && answer ? { question, answer } : null;
    }).filter(Boolean).slice(0, 40);
    if (whatsappEnabled && (!credentials.whatsappPhoneNumberId || !credentials.whatsappAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("WhatsApp চালু করতে Phone Number ID, Access Token, App Secret ও Webhook Verify Token দিন।");
    }
    if (messengerEnabled && (!credentials.messengerPageId || !credentials.messengerPageAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("Messenger চালু করতে Page ID, Page Access Token, App Secret ও Webhook Verify Token দিন।");
    }
    if (facebookCommentAutoReplyEnabled && (!credentials.messengerPageId || !credentials.messengerPageAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("Facebook comment auto-reply চালু করতে Page ID, Page Access Token, App Secret ও Webhook Verify Token দিন।");
    }
    if (instagramEnabled && (!credentials.instagramAccountId || !credentials.instagramAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("Instagram inbox চালু করতে Instagram Professional Account ID, access token, Meta App Secret ও Webhook Verify Token দিন।");
    }
    if (tiktokEnabled && (!credentials.tiktokBusinessId || !credentials.tiktokAccessToken || !credentials.tiktokClientKey || !credentials.tiktokClientSecret)) {
      throw new Error("TikTok inbox চালু করতে Business ID, access token, Client Key ও Client Secret দিন। TikTok Business Messaging API access অনুমোদিত থাকতে হবে।");
    }
    if (credentials.graphApiVersion && !/^v\d+\.\d+$/.test(credentials.graphApiVersion)) {
      throw new Error("Graph API version এভাবে লিখুন: vXX.0");
    }
    if (Object.keys(credentials).length && (!process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY.length < 32)) {
      throw new Error("Chat credentials encrypt করতে PROVIDER_CREDENTIAL_ENCRYPTION_KEY কমপক্ষে 32 অক্ষরের হতে হবে।");
    }
    if (aiAutoReplyEnabled && aiProvider === "OPENAI" && !credentials.openaiApiKey) throw new Error("OpenAI বেছে নিলে AI auto reply চালু করতে OpenAI API key দিন।");
    if (aiAutoReplyEnabled && aiProvider === "GOOGLE_AI_STUDIO" && !credentials.googleAiStudioApiKey) throw new Error("Google AI Studio বেছে নিলে AI auto reply চালু করতে Google AI Studio API key দিন।");
    if (facebookCommentAutoReplyEnabled && !aiAutoReplyEnabled) throw new Error("Facebook comment auto-reply চালাতে AI auto reply-ও চালু করুন।");
    const encryptedCredentials = Object.keys(credentials).length ? encryptProviderCredentials(credentials) : null;
    await prisma.chatSetting.upsert({
      where: { id: SETTING_ID },
      update: { websiteChatEnabled, whatsappEnabled, messengerEnabled, facebookCommentAutoReplyEnabled, instagramEnabled, tiktokEnabled, aiAutoReplyEnabled, aiProvider, openaiModel, googleAiStudioModel, whatsappTextTemplateName, whatsappImageTemplateName, whatsappTemplateLanguage, welcomeMessage, quickReplies, aiReplyTone, aiReplyExamples, encryptedCredentials, updatedBy: userId },
      create: { id: SETTING_ID, websiteChatEnabled, whatsappEnabled, messengerEnabled, facebookCommentAutoReplyEnabled, instagramEnabled, tiktokEnabled, aiAutoReplyEnabled, aiProvider, openaiModel, googleAiStudioModel, whatsappTextTemplateName, whatsappImageTemplateName, whatsappTemplateLanguage, welcomeMessage, quickReplies, aiReplyTone, aiReplyExamples, encryptedCredentials, createdBy: userId, updatedBy: userId },
    });
    revalidatePath("/admin/chat");
    revalidatePath("/admin/chat/settings");
    const requiredMetaFields = [
      ...(messengerEnabled ? ["messages", "messaging_postbacks"] : []),
      ...(facebookCommentAutoReplyEnabled ? ["feed"] : []),
    ];
    const subscription = requiredMetaFields.length ? await ensureMessengerPostbacks(credentials, { force: true, requiredFields: requiredMetaFields }) : null;
    return { success: true, message: subscription?.warning ? `Chat settings saved. ${subscription.warning}` : "Chat settings saved." };
  } catch (error) {
    return actionError(error, "Chat settings could not be saved.");
  }
}

export async function getChatCustomerOrdersAction(conversationId) {
  try {
    await requireProcurementPermission("chat", "view");
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { customerPhone: true } });
    const digits = String(conversation?.customerPhone || "").replace(/\D/g, "");
    if (digits.length < 7) return { success: true, data: { total: 0, running: 0, complete: 0, orders: [] } };
    const phoneSuffix = digits.slice(-10);
    const where = { OR: [{ phoneNumber: { contains: phoneSuffix } }, ...(digits !== phoneSuffix ? [{ phoneNumber: { contains: digits } }] : [])] };
    const [total, grouped, orders] = await Promise.all([prisma.order.count({ where }), prisma.order.groupBy({ by: ["status"], where, _count: { _all: true } }), prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" }, take: 100,
      select: { id: true, orderNo: true, status: true, orderPrice: true, createdAt: true },
    })]);
    const runningStatuses = new Set(["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED"]);
    const counts = new Map(grouped.map((group) => [group.status, group._count._all]));
    return { success: true, data: { total, running: [...runningStatuses].reduce((sum, orderStatus) => sum + (counts.get(orderStatus) || 0), 0), complete: counts.get("DELIVERED") || 0, orders } };
  } catch (error) { return actionError(error, "Customer order summary could not be loaded."); }
}

export async function searchChatProductsAction(rawQuery) {
  try {
    await requireProcurementPermission("chat", "view");
    const query = trim(rawQuery).slice(0, 80);
    if (query.length < 2) return { success: true, data: [] };
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", isActive: true, OR: [{ title: { contains: query, mode: "insensitive" } }, { productCode: { contains: query, mode: "insensitive" } }, { searchText: { contains: query, mode: "insensitive" } }] },
      take: 12, orderBy: { title: "asc" },
      select: { id: true, title: true, slug: true, thumbnail: { select: { url: true, name: true } }, variations: { take: 20, select: { regularPrice: true, discountPrice: true, thumbnail: { select: { url: true, name: true } }, stocks: { select: { available: true } } } } },
    });
    const siteUrl = await getSiteUrl();
    const data = products.map((product) => {
      const variants = product.variations;
      const prices = variants.map((variant) => Number(variant.discountPrice || variant.regularPrice || 0)).filter((price) => price > 0);
      const rawImage = variants.find((variant) => variant.thumbnail?.url)?.thumbnail?.url || product.thumbnail?.url || (product.thumbnail?.name ? `/uploads/${product.thumbnail.name}` : null);
      const imageUrl = rawImage ? new URL(rawImage, siteUrl).toString() : null;
      return { id: product.id, title: product.title, slug: product.slug, url: new URL(`/product/${product.slug}`, siteUrl).toString(), imageUrl, price: prices.length ? Math.min(...prices) : 0, inStock: variants.some((variant) => variant.stocks.some((stock) => stock.available > 0)) };
    });
    return { success: true, data };
  } catch (error) { return actionError(error, "Product search could not be completed."); }
}

export async function getChatMediaLibraryAction() {
  try {
    await requireProcurementPermission("chat", "update");
    await syncLegacyChatMedia();
    const media = await prisma.media.findMany({
      where: {
        host: "cloudinary",
        OR: [".jpg", ".jpeg", ".png"].map((extension) => ({ name: { endsWith: extension, mode: "insensitive" } })),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, url: true, name: true, displayName: true, width: true, height: true },
    });
    return { success: true, data: media };
  } catch (error) { return actionError(error, "Chat media could not be loaded."); }
}

export async function getChatInboxAction({ channel = "ALL", status = "OPEN", search = "" } = {}) {
  try {
    await requireProcurementPermission("chat", "view");
    if (!["ALL", "OPEN", "PENDING", "CLOSED", "NEEDS_HUMAN"].includes(status)) throw new Error("Invalid conversation filter.");
    const conversations = await prisma.chatConversation.findMany({
      where: {
        ...(channel !== "ALL" && { channel }),
        ...(status === "NEEDS_HUMAN" ? { needsHumanAssistant: true } : status !== "ALL" && { status }),
        ...(trim(search) && { OR: [
          { customerName: { contains: trim(search), mode: "insensitive" } },
          { customerPhone: { contains: trim(search), mode: "insensitive" } },
          { messages: { some: { content: { contains: trim(search), mode: "insensitive" } } } },
        ] }),
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
      select: {
        id: true, channel: true, externalUserId: true, customerName: true, customerPhone: true, normalizedPhone: true, profilePicUrl: true, status: true,
        lastMessageAt: true, unreadCount: true, assignedToId: true, assignedTo: { select: { name: true } }, aiModeEnabled: true,
        needsHumanAssistant: true, humanAssistantReason: true, awaitingHumanPhone: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, direction: true, createdAt: true } },
      },
    });
    return { success: true, data: channel === "ALL" ? groupChatInbox(conversations) : conversations.map((item) => ({ ...item, channels: [item.channel], linkedConversations: [{ id: item.id, channel: item.channel, status: item.status, externalUserId: item.externalUserId, customerPhone: item.customerPhone }] })) };
  } catch (error) {
    return actionError(error, "Chat inbox could not be loaded.");
  }
}

export async function getChatConversationAction(conversationId) {
  try {
    await requireProcurementPermission("chat", "view");
    const selected = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!selected) return { success: false, message: "Conversation not found." };
    const linked = selected.normalizedPhone && ["WHATSAPP", "MESSENGER"].includes(selected.channel)
      ? await prisma.chatConversation.findMany({ where: { normalizedPhone: selected.normalizedPhone, channel: { in: ["WHATSAPP", "MESSENGER"] } }, include: { messages: { orderBy: { createdAt: "desc" }, take: 300 } } })
      : [await prisma.chatConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "desc" }, take: 300 } } })];
    const linkedIds = linked.map((item) => item.id);
    await prisma.$transaction([
      prisma.chatConversation.updateMany({ where: { id: { in: linkedIds } }, data: { unreadCount: 0 } }),
      prisma.chatMessage.updateMany({ where: { conversationId: { in: linkedIds }, direction: "INBOUND", deliveryStatus: "DELIVERED" }, data: { deliveryStatus: "READ" } }),
    ]);
    const conversation = {
      ...selected,
      needsHumanAssistant: linked.some((item) => item.needsHumanAssistant),
      humanAssistantReason: linked.find((item) => item.needsHumanAssistant)?.humanAssistantReason || null,
      customerName: linked.find((item) => item.channel === "MESSENGER" && item.customerName)?.customerName || linked.map((item) => item.customerName).filter(Boolean).sort((a, b) => b.trim().split(/\s+/).length - a.trim().split(/\s+/).length)[0] || selected.customerName,
      customerPhone: selected.customerPhone || linked.find((item) => item.customerPhone)?.customerPhone || null,
      profilePicUrl: linked.find((item) => item.profilePicUrl)?.profilePicUrl || null,
      linkedConversations: linked.map((item) => ({ id: item.id, channel: item.channel, status: item.status, externalUserId: item.externalUserId, customerPhone: item.customerPhone })),
      channels: [...new Set(linked.map((item) => item.channel))],
      messages: linked.flatMap((item) => item.messages).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-300),
    };
    return { success: true, data: conversation };
  } catch (error) {
    return actionError(error, "Conversation could not be loaded.");
  }
}

export async function setMessengerCustomerPhoneAction(conversationId, rawPhone) {
  try {
    await requireProcurementPermission("chat", "update");
    const normalizedPhone = normalizeChatPhone(rawPhone);
    if (!normalizedPhone) throw new Error("Country code-সহ সঠিক phone number দিন।");
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { channel: true } });
    if (conversation?.channel !== "MESSENGER") throw new Error("Messenger conversation পাওয়া যায়নি।");
    await prisma.chatConversation.update({ where: { id: conversationId }, data: { customerPhone: normalizedPhone, normalizedPhone } });
    return { success: true };
  } catch (error) { return actionError(error, "Phone number could not be saved."); }
}

export async function getMessengerCustomerProfileAction(conversationId) {
  try {
    await requireProcurementPermission("chat", "view");
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { channel: true, externalUserId: true, customerName: true, profilePicUrl: true },
    });
    if (!conversation || conversation.channel !== "MESSENGER") throw new Error("Messenger conversation পাওয়া যায়নি।");
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
    let profile = {};
    let profileErrorCode = null;
    if (credentials.messengerPageAccessToken && /^v\d+\.\d+$/.test(version || "")) {
      try {
        const url = `https://graph.facebook.com/${version}/${encodeURIComponent(conversation.externalUserId)}?fields=first_name,middle_name,last_name,profile_pic`;
        let response = await fetch(url, {
          headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}` },
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          response = await fetch(url.replace("first_name,middle_name,last_name,profile_pic", "first_name,last_name,profile_pic"), {
            headers: { Authorization: `Bearer ${credentials.messengerPageAccessToken}` },
            cache: "no-store",
            signal: AbortSignal.timeout(5000),
          });
        }
        const result = await response.json();
        if (response.ok) profile = result;
        else profileErrorCode = result.error?.code || null;
      } catch { /* Keep the saved name when Meta is unavailable. */ }
    }
    const name = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(" ").trim() || conversation.customerName;
    let profilePicUrl = null;
    try {
      if (new URL(profile.profile_pic).protocol === "https:") profilePicUrl = profile.profile_pic;
    } catch { /* No usable profile picture. */ }
    if ((name && name !== conversation.customerName) || (profilePicUrl && profilePicUrl !== conversation.profilePicUrl)) {
      await prisma.chatConversation.update({ where: { id: conversationId }, data: { ...(name && { customerName: name }), ...(profilePicUrl && { profilePicUrl }) } });
    }
    return { success: true, data: { name: name || null, profilePicUrl, profileAvailable: Boolean(profile.first_name || profile.middle_name || profile.last_name || profile.profile_pic), profileErrorCode } };
  } catch (error) { return actionError(error, "Messenger profile could not be loaded."); }
}

export async function getChatAssignableUsersAction() {
  try {
    await requireProcurementPermission("chat", "view");
    const users = await prisma.user.findMany({
      where: { role: { name: { not: "USER" } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 100,
    });
    return { success: true, data: users };
  } catch (error) {
    return actionError(error, "Chat agents could not be loaded.");
  }
}

async function sendMetaMessage(conversation, content, { product = null, imageUrl = null, replyToMessageId = null } = {}) {
  const setting = await getSetting();
  const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version)) throw new Error("Chat Settings-এ valid Meta Graph API version configure করুন।");
  const isWhatsApp = conversation.channel === "WHATSAPP";
  const isInstagram = conversation.channel === "INSTAGRAM";
  const accessToken = isWhatsApp ? credentials.whatsappAccessToken : isInstagram ? credentials.instagramAccessToken : credentials.messengerPageAccessToken;
  const resourceId = isWhatsApp ? credentials.whatsappPhoneNumberId : isInstagram ? credentials.instagramAccountId : credentials.messengerPageId;
  if (!accessToken || !resourceId) throw new Error("এই channel-এর Meta credentials configure করা হয়নি।");
  if (!imageUrl && !product) return sendChatChannelTextMessage(conversation, content, credentials, replyToMessageId);
  const url = `https://graph.facebook.com/${version}/${resourceId}/messages`;
  const quoted = replyToMessageId ? { message_id: replyToMessageId } : undefined;
  const messengerReply = replyToMessageId ? { reply_to: { mid: replyToMessageId } } : {};
  const payload = isWhatsApp
    ? imageUrl || product?.mode === "photo-price"
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, ...(quoted && { context: quoted }), type: "image", image: { link: imageUrl || product.imageUrl, ...(content.trim() && { caption: content.slice(0, 1000) }) } }
      : { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, ...(quoted && { context: quoted }), type: "text", text: { body: content, preview_url: true } }
    : imageUrl
      ? { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...messengerReply, message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } } }
      : product?.mode === "photo-price"
        ? { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...messengerReply, message: { attachment: { type: "image", payload: { url: product.imageUrl, is_reusable: true } } } }
        : product
          ? { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...messengerReply, message: { attachment: { type: "template", payload: { template_type: "generic", elements: [{ title: product.title.slice(0, 80), image_url: product.imageUrl || undefined, subtitle: content.slice(0, 80), default_action: { type: "web_url", url: product.mode === "order" ? product.buyNowUrl : product.url }, buttons: [{ type: "web_url", url: product.mode === "order" ? product.buyNowUrl : product.url, title: product.mode === "order" ? "অর্ডার করুন" : "পণ্য দেখুন" }] }] } } } }
        : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...messengerReply, message: { text: content } };
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "Meta message could not be sent.");
  const id = isWhatsApp ? result?.messages?.[0]?.id || null : result?.message_id || null;
  const secondaryIds = [];
  let warning = null;
  if (!isWhatsApp && imageUrl && content.trim()) {
    try {
      const captionResponse = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", ...messengerReply, message: { text: content } }),
        cache: "no-store",
      });
      const captionResult = await captionResponse.json().catch(() => ({}));
      if (captionResponse.ok && captionResult.message_id) secondaryIds.push(captionResult.message_id);
      else warning = captionResult?.error?.message || "Photo গেছে, তবে caption পাঠানো যায়নি।";
    } catch {
      warning = "Photo গেছে, তবে caption পাঠানো যায়নি।";
    }
  }
  return { id, secondaryIds, warning };
}

async function sendTikTokMessage(conversation, content, referencedMessageId = null) {
  const setting = await getSetting();
  const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
  return sendChatChannelTextMessage(conversation, content, credentials, referencedMessageId);
}

async function sendTikTokImageMessage(conversation, imageUrl, caption = "", referencedMessageId = null) {
  const setting = await getSetting();
  const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
  if (!credentials.tiktokAccessToken || !credentials.tiktokBusinessId) throw new Error("TikTok Business Messaging credentials configure করা হয়নি।");
  let sourceUrl;
  try { sourceUrl = new URL(imageUrl); } catch { throw new Error("TikTok-এ পাঠানোর photo URL সঠিক নয়।"); }
  if (sourceUrl.protocol !== "https:" || !/(^|\.)cloudinary\.com$/i.test(sourceUrl.hostname)) throw new Error("TikTok-এ পাঠানোর জন্য Media Library-তে থাকা secure photo দিন।");
  const source = await fetch(sourceUrl, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  const mimeType = source.headers.get("content-type")?.split(";")[0]?.toLowerCase();
  if (!source.ok || !["image/jpeg", "image/png"].includes(mimeType)) throw new Error("TikTok-এ JPG অথবা PNG photo পাঠানো যাবে।");
  if (Number(source.headers.get("content-length") || 0) > 3 * 1024 * 1024) throw new Error("TikTok photo সর্বোচ্চ 3 MB হতে পারে।");
  const bytes = await source.arrayBuffer();
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("TikTok photo সর্বোচ্চ 3 MB হতে পারে।");
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const uploadForm = new FormData();
  uploadForm.set("business_id", credentials.tiktokBusinessId);
  uploadForm.set("media_type", "IMAGE");
  uploadForm.set("file", new Blob([bytes], { type: mimeType }), `chat.${extension}`);
  const uploadResponse = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/media/upload/", {
    method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken }, body: uploadForm, cache: "no-store",
  });
  const uploadResult = await uploadResponse.json().catch(() => ({}));
  const mediaId = uploadResult.data?.media_id;
  if (!uploadResponse.ok || uploadResult.code !== 0 || !mediaId) throw new Error(uploadResult.message || "TikTok-এ photo upload করা যায়নি।");
  const send = async (payload) => {
    const response = await fetch("https://business-api.tiktok.com/open_api/v1.3/business/message/send/", {
      method: "POST", headers: { "Access-Token": credentials.tiktokAccessToken, "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.code !== 0) throw new Error(result.message || "TikTok message পাঠানো যায়নি।");
    return result.data?.message_id || null;
  };
  const base = { business_id: credentials.tiktokBusinessId, recipient_type: "CONVERSATION", recipient: conversation.externalUserId };
  const id = await send({ ...base, message_type: "IMAGE", image: { media_id: mediaId } });
  const secondaryIds = [];
  if (caption.trim()) {
    const captionId = await send({ ...base, message_type: "TEXT", text: { body: caption.slice(0, 6000) }, ...(referencedMessageId && { referenced_message_info: { referenced_message_id: referencedMessageId } }) });
    if (captionId) secondaryIds.push(captionId);
  }
  return { id, secondaryIds };
}

export async function sendChatReplyAction(conversationId, rawContent, retryMessageId = null, product = null, timelineOrderId = null, replyToMessageId = null) {
  try {
    const session = await auth();
    if (!hasUIPermission(session?.user?.permissions, "chat", "update")) throw new Error("Unauthorized");
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error("Conversation not found.");
    if (conversation.status === "CLOSED") throw new Error("আগে conversation আবার খুলুন, তারপর reply দিন।");
    let productCard = null;
    let orderTimelineCard = null;
    if (product?.id) {
      const item = await prisma.product.findFirst({ where: { id: String(product.id), status: "ACTIVE", isActive: true }, select: { id: true, title: true, slug: true, thumbnail: { select: { url: true, name: true } }, variations: { take: 20, select: { regularPrice: true, discountPrice: true, thumbnail: { select: { url: true } } } } } });
      if (!item) throw new Error("এই product আর available নেই।");
      const prices = item.variations.map((variant) => Number(variant.discountPrice || variant.regularPrice || 0)).filter((price) => price > 0);
      const siteUrl = await getSiteUrl();
      const rawImage = item.variations.find((variant) => variant.thumbnail?.url)?.thumbnail?.url || item.thumbnail?.url || (item.thumbnail?.name ? `/uploads/${item.thumbnail.name}` : null);
      const mode = ["page", "order", "photo-price"].includes(product.mode) ? product.mode : "page";
      productCard = { id: item.id, title: item.title, url: new URL(`/product/${item.slug}`, siteUrl).toString(), buyNowUrl: new URL(`/buynow/${item.slug}`, siteUrl).toString(), imageUrl: rawImage ? new URL(rawImage, siteUrl).toString() : null, price: prices.length ? Math.min(...prices) : 0, mode };
      if (mode === "photo-price" && !productCard.imageUrl) throw new Error("এই product-এর photo পাওয়া যায়নি।");
    }
    if (timelineOrderId) {
      const digits = String(conversation.customerPhone || "").replace(/\D/g, "");
      const order = await prisma.order.findUnique({ where: { id: String(timelineOrderId) }, select: { id: true, orderNo: true, phoneNumber: true, status: true, orderPrice: true, createdAt: true, timeline: { orderBy: { createdAt: "asc" }, take: 30, select: { status: true, title: true, message: true, location: true, createdAt: true } } } });
      const orderDigits = String(order?.phoneNumber || "").replace(/\D/g, "");
      if (!order || digits.length < 7 || digits.slice(-10) !== orderDigits.slice(-10)) throw new Error("এই order-টি এই customer chat-এর সঙ্গে মেলেনি।");
      orderTimelineCard = { id: order.id, orderNo: order.orderNo, status: order.status, orderPrice: order.orderPrice, createdAt: order.createdAt.toISOString(), events: order.timeline.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
    }
    let message;
    let replyTo = null;
    if (replyToMessageId) {
      const quoted = await prisma.chatMessage.findUnique({
        where: { id: String(replyToMessageId) },
        select: { id: true, conversationId: true, channel: true, externalMessageId: true, content: true, direction: true, authorType: true, conversation: { select: { normalizedPhone: true } } },
      });
      const sameLinkedContact = conversation.normalizedPhone && quoted?.conversation?.normalizedPhone === conversation.normalizedPhone;
      if (!quoted || (quoted.conversationId !== conversationId && !sameLinkedContact)) throw new Error("যে message-এ reply দিচ্ছেন সেটি পাওয়া যায়নি।");
      replyTo = { id: quoted.id, externalMessageId: quoted.channel === conversation.channel ? quoted.externalMessageId : null, channel: quoted.channel, content: quoted.content.slice(0, 300), direction: quoted.direction, authorType: quoted.authorType };
    }
    if (retryMessageId) {
      message = await prisma.chatMessage.findFirst({ where: { id: retryMessageId, conversationId, direction: "OUTBOUND", authorType: "AGENT", deliveryStatus: "FAILED" } });
      if (!message) throw new Error("এই message-টি retry করা যাবে না।");
      replyTo = message.metadata?.replyTo || null;
      await prisma.$transaction([
        prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENDING" } }),
        prisma.chatConversation.update({ where: { id: conversationId }, data: { aiModeEnabled: false } }),
      ]);
    } else {
      const timelineText = orderTimelineCard ? [`Order ${orderTimelineCard.orderNo} · ${orderTimelineCard.status}`, ...orderTimelineCard.events.map((event) => `${event.title}${event.message ? `: ${event.message}` : ""}${event.location ? ` · ${event.location}` : ""}`)].join("\n") : "";
      const productText = productCard?.mode === "order"
        ? productCard.buyNowUrl
        : productCard?.mode === "photo-price"
          ? `${productCard.title} · ৳${productCard.price}`
          : productCard?.url;
      const content = trim(rawContent).slice(0, 4000) || (productCard ? productText : timelineText);
      if (!content) throw new Error("Message cannot be empty.");
      [message] = await prisma.$transaction([
        prisma.chatMessage.create({ data: { conversationId, channel: conversation.channel, direction: "OUTBOUND", authorType: "AGENT", authorId: session.user.id, content, deliveryStatus: "SENDING", ...((productCard || orderTimelineCard || replyTo) && { metadata: { ...(productCard ? { type: "PRODUCT_CARD", product: productCard } : orderTimelineCard ? { type: "ORDER_TIMELINE", order: orderTimelineCard } : {}), ...(replyTo && { replyTo }) } }) } }),
        prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: "OPEN", aiModeEnabled: false } }),
      ]);
    }
    if (conversation.channel === "WEBSITE") {
      await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT" } });
      return { success: true, data: { ...message, deliveryStatus: "SENT" } };
    }
    try {
      const sent = conversation.channel === "TIKTOK"
        ? await sendTikTokMessage(conversation, message.content, replyTo?.externalMessageId || null)
        : await sendMetaMessage(conversation, message.content, { product: message.metadata?.product || null, imageUrl: message.metadata?.product?.mode === "photo-price" ? message.metadata.product.imageUrl : null, replyToMessageId: replyTo?.externalMessageId || null });
      const metadata = { ...(message.metadata || {}), ...(sent.secondaryIds.length && { externalMessageIds: sent.secondaryIds }) };
      const updated = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT", externalMessageId: sent.id, metadata } });
      return { success: true, data: updated.count ? { ...message, deliveryStatus: "SENT", externalMessageId: sent.id, metadata } : await prisma.chatMessage.findUnique({ where: { id: message.id } }), ...(sent.warning && { warning: sent.warning }) };
    } catch (sendError) {
      const updated = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "FAILED" } });
      return { success: true, data: updated.count ? { ...message, deliveryStatus: "FAILED" } : await prisma.chatMessage.findUnique({ where: { id: message.id } }), warning: sendError?.message || "Message could not be sent." };
    }
  } catch (error) {
    return actionError(error, "Message could not be sent.");
  }
}

export async function sendChatImageAction(conversationId, formData, replyToMessageId = null) {
  try {
    const session = await auth();
    if (!hasUIPermission(session?.user?.permissions, "chat", "update")) throw new Error("Unauthorized");
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error("Conversation not found.");
    if (conversation.status === "CLOSED") throw new Error("আগে conversation আবার খুলুন, তারপর photo পাঠান।");

    const image = formData.get("image");
    const selectedMediaId = trim(formData.get("mediaId"));
    const caption = trim(formData.get("caption")).slice(0, 1000);
    if (selectedMediaId && image?.size) throw new Error("একবারে একটি photo বেছে নিন।");
    if (!selectedMediaId && (!image || typeof image.arrayBuffer !== "function" || !image.size)) throw new Error("একটি photo বেছে নিন।");

    let replyTo = null;
    if (replyToMessageId) {
      const quoted = await prisma.chatMessage.findUnique({
        where: { id: String(replyToMessageId) },
        select: { id: true, conversationId: true, channel: true, externalMessageId: true, content: true, direction: true, authorType: true, conversation: { select: { normalizedPhone: true } } },
      });
      const sameLinkedContact = conversation.normalizedPhone && quoted?.conversation?.normalizedPhone === conversation.normalizedPhone;
      if (!quoted || (quoted.conversationId !== conversationId && !sameLinkedContact)) throw new Error("যে message-এ reply দিচ্ছেন সেটি পাওয়া যায়নি।");
      replyTo = { id: quoted.id, externalMessageId: quoted.channel === conversation.channel ? quoted.externalMessageId : null, channel: quoted.channel, content: quoted.content.slice(0, 300), direction: quoted.direction, authorType: quoted.authorType };
    }

    let mediaRecord;
    let imageMimeType;
    let newlyUploadedMedia = false;
    if (selectedMediaId) {
      mediaRecord = await prisma.media.findUnique({ where: { id: selectedMediaId } });
      if (!mediaRecord || mediaRecord.host !== "cloudinary" || !/^https:\/\//i.test(mediaRecord.url)) throw new Error("Media Library-তে photo পাওয়া যায়নি।");
      const extension = mediaRecord.name.split(".").at(-1).toLowerCase();
      if (!["jpg", "jpeg", "png"].includes(extension)) throw new Error("Chat-এ JPG বা PNG photo পাঠানো যাবে।");
      imageMimeType = extension === "png" ? "image/png" : "image/jpeg";
    } else {
      if (!["image/jpeg", "image/png"].includes(image.type) || image.size > 5 * 1024 * 1024) {
        throw new Error("JPG বা PNG photo দিন (সর্বোচ্চ 5 MB)।");
      }
      const upload = await cloudinaryUpload({
        image,
        tag: "chat-image",
        slug: `chat-${Date.now()}`,
        perifix: "",
      });
      if (!upload?.secure_url || !upload?.public_id) throw new Error("Photo upload করা যায়নি।");
      const mediaName = `${upload.display_name || upload.public_id}.${upload.format}`;
      try {
        mediaRecord = await prisma.media.create({
          data: {
            url: upload.secure_url,
            name: mediaName,
            displayName: image.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Chat photo",
            host: "cloudinary",
            width: Number.isFinite(upload.width) ? upload.width : null,
            height: Number.isFinite(upload.height) ? upload.height : null,
            sizeBytes: Number.isFinite(upload.bytes) ? upload.bytes : image.size,
          },
        });
        newlyUploadedMedia = true;
      } catch (error) {
        try { await cloudinaryDestroy(mediaName); } catch (cleanupError) { console.error("Chat photo cleanup failed:", cleanupError?.message || cleanupError); }
        throw error;
      }
      imageMimeType = image.type;
    }

    const content = caption || "📷 Photo";
    let message;
    try {
      message = await prisma.chatMessage.create({
        data: {
          conversationId,
          channel: conversation.channel,
          direction: "OUTBOUND",
          authorType: "AGENT",
          authorId: session.user.id,
          content,
          deliveryStatus: conversation.channel === "WEBSITE" ? "SENT" : "SENDING",
          mediaId: mediaRecord.id,
          metadata: { type: "IMAGE", image: { url: mediaRecord.url, mediaId: mediaRecord.id, mimeType: imageMimeType }, ...(replyTo && { replyTo }) },
        },
      });
    } catch (error) {
      if (newlyUploadedMedia) {
        try {
          await cloudinaryDestroy(mediaRecord.name);
          await prisma.media.delete({ where: { id: mediaRecord.id } });
        } catch (cleanupError) {
          console.error("Unattached chat photo cleanup failed:", cleanupError?.message || cleanupError);
        }
      }
      throw error;
    }
    await prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: "OPEN", aiModeEnabled: false } });
    if (conversation.channel === "WEBSITE") return { success: true, data: message };

    try {
      const sent = conversation.channel === "TIKTOK"
        ? await sendTikTokImageMessage(conversation, mediaRecord.url, caption, replyTo?.externalMessageId || null)
        : await sendMetaMessage(conversation, caption, {
          imageUrl: mediaRecord.url,
          replyToMessageId: replyTo?.externalMessageId || null,
        });
      const metadata = { ...(message.metadata || {}), ...(sent.secondaryIds.length && { externalMessageIds: sent.secondaryIds }) };
      const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENT", externalMessageId: sent.id, metadata } });
      return { success: true, data: updated, ...(sent.warning && { warning: sent.warning }) };
    } catch (sendError) {
      const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "FAILED" } });
      return { success: true, data: updated, warning: sendError?.message || "Photo পাঠানো যায়নি।" };
    }
  } catch (error) {
    return actionError(error, "Photo could not be sent.");
  }
}

export async function retryChatImageAction(messageId) {
  try {
    await requireProcurementPermission("chat", "update");
    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });
    const imageUrl = message?.metadata?.image?.url;
    if (!message || message.direction !== "OUTBOUND" || message.deliveryStatus !== "FAILED" || message.metadata?.type !== "IMAGE" || !imageUrl) throw new Error("এই photo retry করা যাচ্ছে না।");
    await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENDING" } });
    try {
      const sent = await sendMetaMessage(message.conversation, message.content === "📷 Photo" ? "" : message.content, {
        imageUrl,
        replyToMessageId: message.metadata?.replyTo?.externalMessageId || null,
      });
      const metadata = { ...(message.metadata || {}), ...(sent.secondaryIds.length && { externalMessageIds: sent.secondaryIds }) };
      const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENT", externalMessageId: sent.id, metadata } });
      return { success: true, data: updated, ...(sent.warning && { warning: sent.warning }) };
    } catch (error) {
      const updated = await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "FAILED" } });
      return { success: true, data: updated, warning: error?.message || "Photo পাঠানো যায়নি।" };
    }
  } catch (error) {
    return actionError(error, "Photo retry করা যায়নি।");
  }
}

export async function deleteChatConversationAction(conversationId) {
  try {
    await requireProcurementPermission("chat", "update");
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, normalizedPhone: true, channel: true },
    });
    if (!conversation) throw new Error("Conversation পাওয়া যায়নি।");
    const where = conversation.normalizedPhone && ["WHATSAPP", "MESSENGER"].includes(conversation.channel)
      ? { normalizedPhone: conversation.normalizedPhone, channel: { in: ["WHATSAPP", "MESSENGER"] } }
      : { id: conversation.id };
    const targetConversations = await prisma.chatConversation.findMany({ where, select: { id: true } });
    await syncLegacyChatMedia(targetConversations.map((item) => item.id));
    const conversations = await prisma.chatConversation.findMany({
      where,
      select: { id: true, messages: { select: { mediaId: true } } },
    });
    const mediaIds = [...new Set(conversations.flatMap((item) => item.messages.map((message) => message.mediaId).filter(Boolean)))];
    const media = mediaIds.length ? await prisma.media.findMany({ where: { id: { in: mediaIds } } }) : [];
    const result = await prisma.chatConversation.deleteMany({ where });
    let cleanupWarning = "";
    if (media.length) {
      try {
        const usageIndex = await getMediaUsageIndex(media);
        for (const item of media) {
          if (usageIndex.get(item.id)?.length) continue;
          try {
            await cloudinaryDestroy(item.name);
            await prisma.media.delete({ where: { id: item.id } });
          } catch (error) {
            console.error("Unused chat media cleanup failed:", error?.message || error);
            cleanupWarning = "Chat মুছে গেছে, তবে একটি photo Cloudinary থেকে মুছতে পারেনি; Media Library-তে unused হিসেবে রাখা হয়েছে।";
          }
        }
      } catch (error) {
        console.error("Chat media usage check failed:", error?.message || error);
        cleanupWarning = "Chat মুছে গেছে, তবে photo usage যাচাই করা যায়নি; Media Library-তে ছবি রেখে দেওয়া হয়েছে।";
      }
    }
    revalidatePath("/admin/chat");
    revalidatePath("/admin/media");
    revalidateTag("media");
    return { success: true, deleted: result.count, ...(cleanupWarning && { warning: cleanupWarning }) };
  } catch (error) {
    return actionError(error, "Conversation delete করা যায়নি।");
  }
}

export async function updateChatConversationAction(conversationId, { status, assignedToId, aiModeEnabled, needsHumanAssistant } = {}) {
  try {
    await requireProcurementPermission("chat", "update");
    if (status && !["OPEN", "PENDING", "CLOSED"].includes(status)) throw new Error("Invalid conversation status.");
    if (aiModeEnabled !== undefined && typeof aiModeEnabled !== "boolean") throw new Error("Invalid AI mode setting.");
    if (needsHumanAssistant !== undefined && typeof needsHumanAssistant !== "boolean") throw new Error("Invalid assistance setting.");
    const selected = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true, channel: true, normalizedPhone: true, assignedToId: true } });
    if (!selected) throw new Error("Conversation not found.");
    if (aiModeEnabled === true && (assignedToId || (assignedToId === undefined && selected.assignedToId))) throw new Error("আগে conversation unassign করুন, তারপর AI চালু করুন।");
    const data = { ...(status && { status }), ...(assignedToId !== undefined && { assignedToId }), ...(aiModeEnabled !== undefined && { aiModeEnabled }), ...((assignedToId || status === "PENDING") && { aiModeEnabled: false }) };
    if (needsHumanAssistant === true) Object.assign(data, { needsHumanAssistant: true, humanAssistantReason: "MANUAL", awaitingHumanPhone: false, aiModeEnabled: false });
    if (needsHumanAssistant === false || status === "CLOSED" || aiModeEnabled === true) Object.assign(data, { needsHumanAssistant: false, humanAssistantReason: null, awaitingHumanPhone: false });
    if (aiModeEnabled === true) data.consecutiveAiFailures = 0;
    const where = selected.normalizedPhone && ["WHATSAPP", "MESSENGER"].includes(selected.channel)
      ? { normalizedPhone: selected.normalizedPhone, channel: { in: ["WHATSAPP", "MESSENGER"] } }
      : { id: conversationId };
    await prisma.chatConversation.updateMany({ where, data });
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true, status: true, assignedToId: true, aiModeEnabled: true, needsHumanAssistant: true, humanAssistantReason: true, awaitingHumanPhone: true } });
    return { success: true, data: conversation };
  } catch (error) {
    return actionError(error, "Conversation could not be updated.");
  }
}
