"use server";

import { auth } from "@/auth";
import { decryptProviderCredentials, encryptProviderCredentials } from "@/backend/services/providerCredentialService";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const SETTING_ID = "primary";
const SECRET_KEYS = ["whatsappPhoneNumberId", "whatsappAccessToken", "messengerPageId", "messengerPageAccessToken", "metaAppSecret", "webhookVerifyToken", "graphApiVersion"];
const trim = (value) => String(value ?? "").trim();

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
        configured: Object.fromEntries(SECRET_KEYS.map((key) => [key, Boolean(credentials[key])])),
      },
    };
  } catch (error) {
    return actionError(error, "Chat settings could not be loaded.");
  }
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
      update: { websiteChatEnabled, whatsappEnabled, messengerEnabled, welcomeMessage, encryptedCredentials, updatedBy: userId },
      create: { id: SETTING_ID, websiteChatEnabled, whatsappEnabled, messengerEnabled, welcomeMessage, encryptedCredentials, createdBy: userId, updatedBy: userId },
    });
    revalidatePath("/admin/chat");
    revalidatePath("/admin/chat/settings");
    return { success: true, message: "Chat settings saved." };
  } catch (error) {
    return actionError(error, "Chat settings could not be saved.");
  }
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
        id: true, channel: true, externalUserId: true, customerName: true, customerPhone: true, status: true,
        lastMessageAt: true, unreadCount: true, assignedToId: true, assignedTo: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { content: true, direction: true, createdAt: true } },
      },
    });
    return { success: true, data: conversations };
  } catch (error) {
    return actionError(error, "Chat inbox could not be loaded.");
  }
}

export async function getChatConversationAction(conversationId) {
  try {
    await requireProcurementPermission("chat", "view");
    await prisma.$transaction([
      prisma.chatConversation.update({ where: { id: conversationId }, data: { unreadCount: 0 } }),
      prisma.chatMessage.updateMany({ where: { conversationId, direction: "INBOUND", deliveryStatus: "DELIVERED" }, data: { deliveryStatus: "READ" } }),
    ]);
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 300 } },
    });
    if (!conversation) return { success: false, message: "Conversation not found." };
    return { success: true, data: conversation };
  } catch (error) {
    return actionError(error, "Conversation could not be loaded.");
  }
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

async function sendMetaMessage(conversation, content) {
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
    ? { messaging_product: "whatsapp", recipient_type: "individual", to: conversation.externalUserId, type: "text", text: { body: content } }
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

export async function sendChatReplyAction(conversationId, rawContent, retryMessageId = null) {
  try {
    const session = await auth();
    if (!hasUIPermission(session?.user?.permissions, "chat", "update")) throw new Error("Unauthorized");
    const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw new Error("Conversation not found.");
    if (conversation.status === "CLOSED") throw new Error("আগে conversation আবার খুলুন, তারপর reply দিন।");
    let message;
    if (retryMessageId) {
      message = await prisma.chatMessage.findFirst({ where: { id: retryMessageId, conversationId, direction: "OUTBOUND", authorType: "AGENT", deliveryStatus: "FAILED" } });
      if (!message) throw new Error("এই message-টি retry করা যাবে না।");
      await prisma.chatMessage.update({ where: { id: message.id }, data: { deliveryStatus: "SENDING" } });
    } else {
      const content = trim(rawContent).slice(0, 4000);
      if (!content) throw new Error("Message cannot be empty.");
      [message] = await prisma.$transaction([
        prisma.chatMessage.create({ data: { conversationId, channel: conversation.channel, direction: "OUTBOUND", authorType: "AGENT", authorId: session.user.id, content, deliveryStatus: "SENDING" } }),
        prisma.chatConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), status: "OPEN" } }),
      ]);
    }
    if (conversation.channel === "WEBSITE") {
      await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT" } });
      return { success: true, data: await prisma.chatMessage.findUnique({ where: { id: message.id } }) };
    }
    try {
      const externalMessageId = await sendMetaMessage(conversation, message.content);
      await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "SENT", externalMessageId } });
      return { success: true, data: await prisma.chatMessage.findUnique({ where: { id: message.id } }) };
    } catch (sendError) {
      await prisma.chatMessage.updateMany({ where: { id: message.id, deliveryStatus: "SENDING" }, data: { deliveryStatus: "FAILED" } });
      return { success: true, data: await prisma.chatMessage.findUnique({ where: { id: message.id } }), warning: sendError?.message || "Message could not be sent." };
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
    const conversation = await prisma.chatConversation.update({ where: { id: conversationId }, data, select: { id: true, status: true, assignedToId: true } });
    return { success: true, data: conversation };
  } catch (error) {
    return actionError(error, "Conversation could not be updated.");
  }
}
