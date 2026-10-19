"use server";

import { auth } from "@/auth";
import { decryptProviderCredentials, encryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSiteUrl } from "@/lib/siteUrl";
import { groupChatInbox, normalizeChatPhone } from "@/lib/chatIdentity";
import { getOrderPushPublicKey, saveOrderPushSubscription, removeOrderPushSubscription } from "@/backend/services/orderPushService";
import { sendChatPushTestNotification } from "@/backend/services/chatPushService";
import jwt from "jsonwebtoken";

const SETTING_ID = "primary";
const SECRET_KEYS = ["whatsappPhoneNumberId", "whatsappAccessToken", "messengerPageId", "messengerPageAccessToken", "metaAppSecret", "webhookVerifyToken", "graphApiVersion"];
const trim = (value) => String(value ?? "").trim();

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

export async function getChatSettingsAction() {
  try {
    await requireProcurementPermission("chat", "view");
    const setting = await getSetting();
    const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
    return {
      success: true,
      data: {
        websiteChatEnabled: setting?.websiteChatEnabled ?? true,
        whatsappEnabled: setting?.whatsappEnabled ?? false,
        messengerEnabled: setting?.messengerEnabled ?? false,
        welcomeMessage: setting?.welcomeMessage || "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?",
        quickReplies: Array.isArray(setting?.quickReplies) ? setting.quickReplies : [],
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
    const whatsappEnabled = formData.get("whatsappEnabled") === "on";
    const messengerEnabled = formData.get("messengerEnabled") === "on";
    const welcomeMessage = trim(formData.get("welcomeMessage")).slice(0, 300) || "আসসালামু আলাইকুম! কীভাবে সাহায্য করতে পারি?";
    const quickReplies = String(formData.get("quickReplies") || "").split("\n").map((line) => {
      const separator = line.indexOf("=");
      if (separator < 1) return null;
      const shortcut = line.slice(0, separator).trim().replace(/^\//, "").slice(0, 40);
      const text = line.slice(separator + 1).trim().slice(0, 500);
      return shortcut && text ? { shortcut, text } : null;
    }).filter(Boolean).slice(0, 50);
    if (whatsappEnabled && (!credentials.whatsappPhoneNumberId || !credentials.whatsappAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("WhatsApp চালু করতে Phone Number ID, Access Token, App Secret ও Webhook Verify Token দিন।");
    }
    if (messengerEnabled && (!credentials.messengerPageId || !credentials.messengerPageAccessToken || !credentials.metaAppSecret || !credentials.webhookVerifyToken)) {
      throw new Error("Messenger চালু করতে Page ID, Page Access Token, App Secret ও Webhook Verify Token দিন।");
    }
    if (credentials.graphApiVersion && !/^v\d+\.\d+$/.test(credentials.graphApiVersion)) {
      throw new Error("Graph API version এভাবে লিখুন: vXX.0");
    }
    if (Object.keys(credentials).length && (!process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY.length < 32)) {
      throw new Error("Meta credentials encrypt করতে PROVIDER_CREDENTIAL_ENCRYPTION_KEY কমপক্ষে 32 অক্ষরের হতে হবে।");
    }
    const encryptedCredentials = Object.keys(credentials).length ? encryptProviderCredentials(credentials) : null;
    await prisma.chatSetting.upsert({
      where: { id: SETTING_ID },
      update: { websiteChatEnabled, whatsappEnabled, messengerEnabled, welcomeMessage, quickReplies, encryptedCredentials, updatedBy: userId },
      create: { id: SETTING_ID, websiteChatEnabled, whatsappEnabled, messengerEnabled, welcomeMessage, quickReplies, encryptedCredentials, createdBy: userId, updatedBy: userId },
    });
    revalidatePath("/admin/chat");
    revalidatePath("/admin/chat/settings");
    return { success: true, message: "Chat settings saved." };
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

export async function getChatInboxAction({ channel = "ALL", status = "OPEN", search = "" } = {}) {
  try {
    await requireProcurementPermission("chat", "view");
    const conversations = await prisma.chatConversation.findMany({
      where: {
        ...(channel !== "ALL" && { channel }),
        ...(status !== "ALL" && { status }),
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
        lastMessageAt: true, unreadCount: true, assignedToId: true, assignedTo: { select: { name: true } },
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

async function sendMetaMessage(conversation, content, product = null) {
  const setting = await getSetting();
  const credentials = setting?.encryptedCredentials ? decryptProviderCredentials(setting.encryptedCredentials) : {};
  const version = credentials.graphApiVersion || process.env.META_GRAPH_API_VERSION;
  if (!version || !/^v\d+\.\d+$/.test(version)) throw new Error("Chat Settings-এ valid Meta Graph API version configure করুন।");
  const isWhatsApp = conversation.channel === "WHATSAPP";
  const accessToken = isWhatsApp ? credentials.whatsappAccessToken : credentials.messengerPageAccessToken;
  const resourceId = isWhatsApp ? credentials.whatsappPhoneNumberId : credentials.messengerPageId;
  if (!accessToken || !resourceId) throw new Error("এই channel-এর Meta credentials configure করা হয়নি।");
  const url = `https://graph.facebook.com/${version}/${resourceId}/messages`;
  const payload = isWhatsApp
    ? product?.imageUrl
      ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, type: "image", image: { link: product.imageUrl, caption: content } }
      : { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, type: "text", text: { body: content } }
    : product
      ? { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: { attachment: { type: "template", payload: { template_type: "generic", elements: [{ title: product.title.slice(0, 80), image_url: product.imageUrl || undefined, subtitle: content.slice(0, 80), default_action: { type: "web_url", url: product.url }, buttons: [{ type: "web_url", url: product.url, title: "পণ্য দেখুন" }] }] } } } }
      : { recipient: { id: conversation.externalUserId }, messaging_type: "RESPONSE", message: { text: content } };
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || "Meta message could not be sent.");
  return isWhatsApp ? result?.messages?.[0]?.id || null : result?.message_id || null;
}

export async function sendChatReplyAction(conversationId, rawContent, retryMessageId = null, product = null, timelineOrderId = null) {
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
      productCard = { id: item.id, title: item.title, url: new URL(`/product/${item.slug}`, siteUrl).toString(), imageUrl: rawImage ? new URL(rawImage, siteUrl).toString() : null, price: prices.length ? Math.min(...prices) : 0 };
    }
    if (timelineOrderId) {
      const digits = String(conversation.customerPhone || "").replace(/\D/g, "");
      const order = await prisma.order.findUnique({ where: { id: String(timelineOrderId) }, select: { id: true, orderNo: true, phoneNumber: true, status: true, orderPrice: true, createdAt: true, timeline: { orderBy: { createdAt: "asc" }, take: 30, select: { status: true, title: true, message: true, location: true, createdAt: true } } } });
      const orderDigits = String(order?.phoneNumber || "").replace(/\D/g, "");
      if (!order || digits.length < 7 || digits.slice(-10) !== orderDigits.slice(-10)) throw new Error("এই order-টি এই customer chat-এর সঙ্গে মেলেনি।");
      orderTimelineCard = { id: order.id, orderNo: order.orderNo, status: order.status, orderPrice: order.orderPrice, createdAt: order.createdAt.toISOString(), events: order.timeline.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })) };
    }
    let message;
    if (retryMessageId) {
      message = await prisma.chatMessage.findFirst({ where: { id: retryMessageId, conversationId, direction: "OUTBOUND", authorType: "AGENT", deliveryStatus: "FAILED" } });
      if (!message) throw new Error("এই message-টি retry করা যাবে না।");
      await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENDING" } });
    } else {
      const timelineText = orderTimelineCard ? [`Order ${orderTimelineCard.orderNo} · ${orderTimelineCard.status}`, ...orderTimelineCard.events.map((event) => `${event.title}${event.message ? `: ${event.message}` : ""}${event.location ? ` · ${event.location}` : ""}`)].join("\n") : "";
      const content = trim(rawContent).slice(0, 4000) || (productCard ? `${productCard.title} · ৳${productCard.price}\n${productCard.url}` : timelineText);
      if (!content) throw new Error("Message cannot be empty.");
      [message] = await prisma.$transaction([
        prisma.chatMessage.create({ data: { conversationId, channel: conversation.channel, direction: "OUTBOUND", authorType: "AGENT", authorId: session.user.id, content, deliveryStatus: "SENDING", ...((productCard || orderTimelineCard) && { metadata: productCard ? { type: "PRODUCT_CARD", product: productCard } : { type: "ORDER_TIMELINE", order: orderTimelineCard } }) } }),
        prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: "OPEN" } }),
      ]);
    }
    if (conversation.channel === "WEBSITE") {
      await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT" } });
      return { success: true, data: { ...message, deliveryStatus: "SENT" } };
    }
    try {
      const externalMessageId = await sendMetaMessage(conversation, message.content, message.metadata?.product || null);
      const updated = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT", externalMessageId } });
      return { success: true, data: updated.count ? { ...message, deliveryStatus: "SENT", externalMessageId } : await prisma.chatMessage.findUnique({ where: { id: message.id } }) };
    } catch (sendError) {
      const updated = await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "FAILED" } });
      return { success: true, data: updated.count ? { ...message, deliveryStatus: "FAILED" } : await prisma.chatMessage.findUnique({ where: { id: message.id } }), warning: sendError?.message || "Message could not be sent." };
    }
  } catch (error) {
    return actionError(error, "Message could not be sent.");
  }
}

export async function updateChatConversationAction(conversationId, { status, assignedToId } = {}) {
  try {
    await requireProcurementPermission("chat", "update");
    if (status && !["OPEN", "PENDING", "CLOSED"].includes(status)) throw new Error("Invalid conversation status.");
    const data = { ...(status && { status }), ...(assignedToId !== undefined && { assignedToId }) };
    const selected = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true, channel: true, normalizedPhone: true } });
    if (!selected) throw new Error("Conversation not found.");
    const where = selected.normalizedPhone && ["WHATSAPP", "MESSENGER"].includes(selected.channel)
      ? { normalizedPhone: selected.normalizedPhone, channel: { in: ["WHATSAPP", "MESSENGER"] } }
      : { id: conversationId };
    await prisma.chatConversation.updateMany({ where, data });
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId }, select: { id: true, status: true, assignedToId: true } });
    return { success: true, data: conversation };
  } catch (error) {
    return actionError(error, "Conversation could not be updated.");
  }
}
