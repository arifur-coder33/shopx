"use server";

import { auth } from "@/auth";
import { getEmailConfiguration, saveEmailConfiguration, sendConfiguredEmail } from "@/backend/services/emailService";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireEmailPermission(action) {
  const session = await auth();
  if (!hasUIPermission(session?.user?.permissions, "chatInbox", action)) throw new Error("You do not have permission to access email support.");
  return session.user;
}

export async function getEmailConfigurationAction() {
  try {
    await requireEmailPermission("view");
    const value = await getEmailConfiguration();
    return { success: true, data: {
      fromEmail: value.fromEmail, fromName: value.fromName, supportInboxEmail: value.supportInboxEmail,
      resendApiKeyConfigured: Boolean(value.resendApiKey), webhookSigningSecretConfigured: Boolean(value.webhookSigningSecret),
      emailVerificationEnabled: value.emailVerificationEnabled, passwordResetEnabled: value.passwordResetEnabled,
      orderConfirmationEnabled: value.orderConfirmationEnabled, orderStatusEnabled: value.orderStatusEnabled,
      deliverySuccessEnabled: value.deliverySuccessEnabled,
    } };
  } catch (error) { return { success: false, message: error.message || "Email settings could not be loaded." }; }
}

export async function saveEmailConfigurationAction(formData) {
  try {
    await requireEmailPermission("update");
    await saveEmailConfiguration(Object.fromEntries(formData.entries()));
    revalidatePath("/admin/settings/email");
    revalidatePath("/admin/support/email");
    return { success: true, message: "Email settings saved." };
  } catch (error) { return { success: false, message: error.message || "Email settings could not be saved." }; }
}

export async function sendEmailTestAction(to) {
  try {
    await requireEmailPermission("update");
    const address = String(to || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error("Enter a valid test email address.");
    await sendConfiguredEmail({ to: address, subject: "Resend configuration test", text: "Resend email configuration is working.", html: "<p>Resend email configuration is working.</p>" });
    return { success: true, message: "Test email sent." };
  } catch (error) { return { success: false, message: error.message || "Test email could not be sent." }; }
}

export async function getEmailSupportInboxAction() {
  try {
    await requireEmailPermission("view");
    const data = await prisma.supportEmailConversation.findMany({
      take: 100, orderBy: { lastMessageAt: "desc" },
      select: {
        id: true, customerEmail: true, subject: true, lastMessageAt: true,
        messages: { take: 1, orderBy: { createdAt: "desc" }, select: { id: true, direction: true, textBody: true, createdAt: true } },
        _count: { select: { messages: true } },
      },
    });
    const counts = await prisma.supportEmailMessage.groupBy({ by: ["conversationId"], where: { direction: "INBOUND", isRead: false, conversationId: { in: data.map((item) => item.id) } }, _count: { _all: true } });
    const unread = Object.fromEntries(counts.map((row) => [row.conversationId, row._count._all]));
    return { success: true, data: data.map((row) => ({ ...row, unreadCount: unread[row.id] || 0 })) };
  } catch (error) { return { success: false, message: error.message || "Email inbox could not be loaded." }; }
}

export async function getEmailConversationAction(conversationId) {
  try {
    await requireEmailPermission("view");
    if (!conversationId) throw new Error("Select an email conversation.");
    const data = await prisma.supportEmailConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!data) throw new Error("Email conversation not found.");
    await prisma.supportEmailMessage.updateMany({ where: { conversationId, direction: "INBOUND", isRead: false }, data: { isRead: true } });
    return { success: true, data };
  } catch (error) { return { success: false, message: error.message || "Email conversation could not be loaded." }; }
}

export async function replyToEmailConversationAction({ conversationId, message }) {
  try {
    await requireEmailPermission("update");
    const body = String(message || "").trim();
    if (!body || body.length > 20000) throw new Error("Reply must contain 1–20,000 characters.");
    const conversation = await prisma.supportEmailConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (!conversation) throw new Error("Email conversation not found.");
    const settings = await getEmailConfiguration();
    const last = conversation.messages[0];
    const subject = /^re:/iu.test(conversation.subject) ? conversation.subject : `Re: ${conversation.subject}`;
    const escaped = body.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])).replace(/\n/g, "<br>");
    const sent = await sendConfiguredEmail({ to: conversation.customerEmail, subject, text: body, html: `<div>${escaped}</div>`, ...(last?.internetMessageId ? { headers: { "In-Reply-To": last.internetMessageId, References: last.internetMessageId } } : {}) });
    const fromEmail = settings.fromEmail;
    await prisma.supportEmailMessage.create({ data: { conversationId, direction: "OUTBOUND", fromEmail, toEmail: conversation.customerEmail, subject, textBody: body, resendEmailId: sent.id || null } });
    await prisma.supportEmailConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), subject } });
    revalidatePath("/admin/support/email");
    return { success: true, message: "Email reply sent." };
  } catch (error) { return { success: false, message: error.message || "Email reply could not be sent." }; }
}
