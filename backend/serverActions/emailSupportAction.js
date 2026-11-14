"use server";

import { auth } from "@/auth";
import { getEmailConfiguration, normalizeEmailSubject, parseEmailAttachments, readEmailAttachmentFiles, saveEmailConfiguration, sendConfiguredEmail } from "@/backend/services/emailService";
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
      where: { messages: { some: { direction: "INBOUND" } } },
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

export async function getEmailSupportFolderAction(folder) {
  try {
    await requireEmailPermission("view");
    if (folder === "sent") {
      const messages = await prisma.supportEmailMessage.findMany({
        where: { direction: "OUTBOUND" }, take: 100, orderBy: { createdAt: "desc" },
        select: { id: true, conversationId: true, toEmail: true, subject: true, textBody: true, createdAt: true, attachmentsJson: true, conversation: { select: { customerEmail: true, subject: true } } },
      });
      return { success: true, data: messages.map(({ attachmentsJson, ...item }) => ({ ...item, attachments: parseEmailAttachments(attachmentsJson) })) };
    }
    if (folder === "drafts") {
      const drafts = await prisma.supportEmailDraft.findMany({ take: 100, orderBy: { updatedAt: "desc" } });
      return { success: true, data: drafts.map(({ attachmentsJson, ...item }) => ({ ...item, attachments: parseEmailAttachments(attachmentsJson) })) };
    }
    return { success: true, data: [] };
  } catch (error) { return { success: false, message: error.message || "Email folder could not be loaded." }; }
}

export async function saveEmailDraftAction(formData) {
  try {
    await requireEmailPermission("update");
    const draftId = String(formData.get("draftId") || "").trim();
    const conversationId = String(formData.get("conversationId") || "").trim() || null;
    const conversation = conversationId ? await prisma.supportEmailConversation.findUnique({ where: { id: conversationId }, select: { customerEmail: true, subject: true } }) : null;
    if (conversationId && !conversation) throw new Error("Email conversation not found.");
    const existing = draftId ? await prisma.supportEmailDraft.findUnique({ where: { id: draftId } }) : null;
    if (draftId && !existing) throw new Error("Draft not found.");
    const attachments = await readEmailAttachmentFiles(formData, parseEmailAttachments(existing?.attachmentsJson, { includeContent: true }));
    const toEmail = String(formData.get("toEmail") || conversation?.customerEmail || "").trim().toLowerCase();
    if (toEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) throw new Error("প্রাপকের email ঠিকানা সঠিক নয়।");
    const subject = String(formData.get("subject") || (conversation ? `Re: ${conversation.subject}` : "")).trim().slice(0, 240);
    const textBody = String(formData.get("message") || "").slice(0, 20000);
    const data = { conversationId, toEmail: toEmail || null, subject: subject || null, textBody, attachmentsJson: attachments.length ? JSON.stringify(attachments) : null };
    const draft = existing
      ? await prisma.supportEmailDraft.update({ where: { id: existing.id }, data })
      : await prisma.supportEmailDraft.create({ data });
    revalidatePath("/admin/support/email");
    return { success: true, id: draft.id, message: "Draft saved." };
  } catch (error) { return { success: false, message: error.message || "Draft could not be saved." }; }
}

export async function deleteEmailDraftAction(draftId) {
  try {
    await requireEmailPermission("update");
    const id = String(draftId || "").trim();
    if (!id) throw new Error("Draft not found.");
    await prisma.supportEmailDraft.delete({ where: { id } });
    revalidatePath("/admin/support/email");
    return { success: true };
  } catch (error) { return { success: false, message: error.message || "Draft could not be deleted." }; }
}

export async function getEmailConversationAction(conversationId) {
  try {
    await requireEmailPermission("view");
    if (!conversationId) throw new Error("Select an email conversation.");
    const data = await prisma.supportEmailConversation.findUnique({ where: { id: conversationId }, include: { messages: { orderBy: { createdAt: "asc" } } } });
    if (!data) throw new Error("Email conversation not found.");
    await prisma.supportEmailMessage.updateMany({ where: { conversationId, direction: "INBOUND", isRead: false }, data: { isRead: true } });
    const { messages, ...conversation } = data;
    return { success: true, data: { ...conversation, messages: messages.map(({ attachmentsJson, ...message }) => ({ ...message, attachments: parseEmailAttachments(attachmentsJson) })) } };
  } catch (error) { return { success: false, message: error.message || "Email conversation could not be loaded." }; }
}

export async function sendEmailSupportMessageAction(formData) {
  try {
    await requireEmailPermission("update");
    const conversationId = String(formData.get("conversationId") || "").trim();
    const draftId = String(formData.get("draftId") || "").trim();
    const draft = draftId ? await prisma.supportEmailDraft.findUnique({ where: { id: draftId } }) : null;
    if (draftId && !draft) throw new Error("Draft not found.");
    const existingAttachments = parseEmailAttachments(draft?.attachmentsJson, { includeContent: true });
    const attachments = await readEmailAttachmentFiles(formData, existingAttachments);
    const body = String(formData.get("message") || "").trim();
    if (!body || body.length > 20000) throw new Error("Message must contain 1–20,000 characters.");
    const conversation = conversationId ? await prisma.supportEmailConversation.findUnique({ where: { id: conversationId }, include: { messages: { where: { direction: "INBOUND", internetMessageId: { not: null } }, orderBy: { createdAt: "desc" }, take: 1 } } }) : null;
    if (conversationId && !conversation) throw new Error("Email conversation not found.");
    const toEmail = String(formData.get("toEmail") || draft?.toEmail || conversation?.customerEmail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) throw new Error("একটি সঠিক প্রাপকের email ঠিকানা দিন।");
    const subjectInput = String(formData.get("subject") || draft?.subject || "").trim().slice(0, 240);
    if (!conversation && !subjectInput) throw new Error("Email subject লিখুন।");
    const settings = await getEmailConfiguration();
    const last = conversation?.messages[0];
    const subject = conversation
      ? (/^re:/iu.test(conversation.subject) ? conversation.subject : `Re: ${conversation.subject}`)
      : subjectInput;
    const escaped = body.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])).replace(/\n/g, "<br>");
    const sent = await sendConfiguredEmail({ to: toEmail, subject, text: body, html: `<div>${escaped}</div>`, attachments, ...(last?.internetMessageId ? { headers: { "In-Reply-To": last.internetMessageId, References: last.internetMessageId } } : {}) });
    const happenedAt = new Date();
    const savedConversation = conversation || await prisma.supportEmailConversation.create({ data: { customerEmail: toEmail, subject, normalizedSubject: normalizeEmailSubject(subject), lastMessageAt: happenedAt } });
    const fromEmail = settings.fromEmail;
    await prisma.supportEmailMessage.create({ data: { conversationId: savedConversation.id, direction: "OUTBOUND", fromEmail, toEmail, subject, textBody: body, resendEmailId: sent.id || null, attachmentsJson: attachments.length ? JSON.stringify(attachments) : null, createdAt: happenedAt } });
    await prisma.supportEmailConversation.update({ where: { id: savedConversation.id }, data: { lastMessageAt: happenedAt, subject } });
    if (draftId) await prisma.supportEmailDraft.delete({ where: { id: draftId } });
    revalidatePath("/admin/support/email");
    return { success: true, conversationId: savedConversation.id, message: "Email sent." };
  } catch (error) { return { success: false, message: error.message || "Email could not be sent." }; }
}
