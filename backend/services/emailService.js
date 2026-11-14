import { randomUUID } from "node:crypto";
import { decryptProviderCredentials, encryptProviderCredentials } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";

const CONFIG_ID = "EMAIL";
export const EMAIL_SECRET_FIELDS = ["resendApiKey", "webhookSigningSecret"];
const clean = (value) => String(value ?? "").trim();

export async function getEmailConfiguration() {
  const record = await prisma.emailConfiguration.findUnique({ where: { id: CONFIG_ID } });
  let credentials = {};
  if (record?.encryptedCredentials) {
    try { credentials = decryptProviderCredentials(record.encryptedCredentials); } catch { credentials = {}; }
  }
  return {
    record,
    resendApiKey: clean(credentials.resendApiKey),
    webhookSigningSecret: clean(credentials.webhookSigningSecret),
    fromEmail: clean(record?.fromEmail),
    fromName: clean(record?.fromName),
    supportInboxEmail: clean(record?.supportInboxEmail),
    emailVerificationEnabled: record?.emailVerificationEnabled ?? true,
    passwordResetEnabled: record?.passwordResetEnabled ?? true,
    orderConfirmationEnabled: record?.orderConfirmationEnabled ?? true,
    orderStatusEnabled: record?.orderStatusEnabled ?? true,
    deliverySuccessEnabled: record?.deliverySuccessEnabled ?? true,
  };
}

export async function saveEmailConfiguration(values) {
  const existing = await getEmailConfiguration();
  const credentials = {
    resendApiKey: clean(values.resendApiKey) || existing.resendApiKey,
    webhookSigningSecret: clean(values.webhookSigningSecret) || existing.webhookSigningSecret,
  };
  if (values.clearResendApiKey === "true") credentials.resendApiKey = "";
  if (values.clearWebhookSigningSecret === "true") credentials.webhookSigningSecret = "";
  const encryptedCredentials = Object.values(credentials).some(Boolean)
    ? encryptProviderCredentials(credentials)
    : null;
  const fromEmail = clean(values.fromEmail).toLowerCase();
  const supportInboxEmail = clean(values.supportInboxEmail).toLowerCase();
  for (const [label, email] of [["Sender", fromEmail], ["Support inbox", supportInboxEmail]]) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`${label} email address is invalid.`);
  }
  return prisma.emailConfiguration.upsert({
    where: { id: CONFIG_ID },
    update: {
      encryptedCredentials,
      fromEmail: fromEmail || null,
      fromName: clean(values.fromName).slice(0, 120) || null,
      supportInboxEmail: supportInboxEmail || null,
      emailVerificationEnabled: values.emailVerificationEnabled === "true",
      passwordResetEnabled: values.passwordResetEnabled === "true",
      orderConfirmationEnabled: values.orderConfirmationEnabled === "true",
      orderStatusEnabled: values.orderStatusEnabled === "true",
      deliverySuccessEnabled: values.deliverySuccessEnabled === "true",
    },
    create: {
      id: CONFIG_ID,
      encryptedCredentials,
      fromEmail: fromEmail || null,
      fromName: clean(values.fromName).slice(0, 120) || null,
      supportInboxEmail: supportInboxEmail || null,
      emailVerificationEnabled: values.emailVerificationEnabled === "true",
      passwordResetEnabled: values.passwordResetEnabled === "true",
      orderConfirmationEnabled: values.orderConfirmationEnabled === "true",
      orderStatusEnabled: values.orderStatusEnabled === "true",
      deliverySuccessEnabled: values.deliverySuccessEnabled === "true",
    },
  });
}

const categoryEnabled = (settings, category) => ({
  verification: settings.emailVerificationEnabled,
  passwordReset: settings.passwordResetEnabled,
  orderConfirmation: settings.orderConfirmationEnabled,
  orderStatus: settings.orderStatusEnabled,
  deliverySuccess: settings.deliverySuccessEnabled,
}[category] ?? true);

export async function sendConfiguredEmail({ to, subject, html, text, category, headers, attachments = [] }) {
  const settings = await getEmailConfiguration();
  if (category && !categoryEnabled(settings, category)) return { success: true, skipped: true };
  const apiKey = settings.resendApiKey;
  const fromEmail = settings.fromEmail;
  if (!apiKey || !fromEmail) throw new Error("Resend email configuration incomplete. Set API key and sender email in Email Configuration.");
  const from = settings.fromName ? `${settings.fromName} <${fromEmail}>` : fromEmail;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(text ? { text } : {}),
      ...(headers ? { headers } : {}),
      ...(attachments.length ? { attachments: attachments.map((attachment) => ({ filename: attachment.filename, content: attachment.contentBase64, content_type: attachment.mimeType })) } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.message || result?.name || "Resend could not send the email.");
  return { success: true, id: result.id };
}

const safeFilename = (value) => clean(value).replace(/[\\/\u0000-\u001f]/g, "_").slice(0, 180) || "attachment";

export function parseEmailAttachments(value, { includeContent = false } = {}) {
  try {
    const rows = Array.isArray(value) ? value : JSON.parse(value || "[]");
    if (!Array.isArray(rows)) return [];
    return rows.map((item) => ({
      id: clean(item.id),
      filename: safeFilename(item.filename),
      mimeType: clean(item.mimeType || item.content_type) || "application/octet-stream",
      size: Number(item.size || 0),
      ...(item.resendAttachmentId && { resendAttachmentId: clean(item.resendAttachmentId) }),
      ...(includeContent && item.contentBase64 && { contentBase64: item.contentBase64 }),
    })).filter((item) => item.id && item.filename);
  } catch { return []; }
}

export async function readEmailAttachmentFiles(formData, existingAttachments = []) {
  const keepRaw = clean(formData.get("keepAttachmentIds"));
  let keepIds = existingAttachments.map((item) => item.id);
  if (keepRaw) {
    try { keepIds = JSON.parse(keepRaw); } catch { throw new Error("Attachment selection is invalid."); }
  }
  if (!Array.isArray(keepIds) || keepIds.some((id) => typeof id !== "string")) throw new Error("Attachment selection is invalid.");
  const attachments = existingAttachments.filter((item) => keepIds.includes(item.id));
  let totalSize = attachments.reduce((sum, item) => sum + Number(item.size || 0), 0);
  const files = formData.getAll("files").filter((value) => value && typeof value.arrayBuffer === "function" && Number(value.size) > 0);
  if (attachments.length + files.length > 8) throw new Error("একটি email-এ সর্বোচ্চ ৮টি file দিতে পারবেন।");
  for (const file of files) {
    totalSize += file.size;
    if (totalSize > 4 * 1024 * 1024) throw new Error("সব attachment মিলিয়ে ৪ MB-এর মধ্যে রাখুন।");
    attachments.push({
      id: randomUUID(),
      filename: safeFilename(file.name),
      mimeType: clean(file.type) || "application/octet-stream",
      size: file.size,
      contentBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    });
  }
  if (totalSize > 4 * 1024 * 1024) throw new Error("সব attachment মিলিয়ে ৪ MB-এর মধ্যে রাখুন।");
  return attachments;
}

export function normalizeEmailSubject(subject = "") {
  return clean(subject).replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/iu, "").trim().toLowerCase() || "(no subject)";
}

export async function storeReceivedEmail(data, content) {
  const emailId = clean(data.email_id);
  if (!emailId) throw new Error("Missing Resend email id.");
  const duplicate = await prisma.supportEmailMessage.findUnique({ where: { resendEmailId: emailId }, select: { id: true } });
  if (duplicate) return { duplicate: true };
  const fromEmail = clean(data.from).match(/<([^>]+)>/)?.[1] || clean(data.from);
  const toEmail = (Array.isArray(data.to) ? data.to : [data.to]).map(clean).find(Boolean) || "";
  const subject = clean(data.subject) || "(No subject)";
  const normalizedSubject = normalizeEmailSubject(subject);
  const rawAttachments = Array.isArray(content.attachments) && content.attachments.length ? content.attachments : Array.isArray(data.attachments) ? data.attachments : [];
  const attachments = rawAttachments.map((item) => ({
    id: clean(item.id),
    resendAttachmentId: clean(item.id),
    filename: safeFilename(item.filename),
    mimeType: clean(item.content_type || item.contentType) || "application/octet-stream",
    size: Number(item.size || 0),
  })).filter((item) => item.id && item.filename);
  const happenedAt = new Date();
  const existing = await prisma.supportEmailConversation.findFirst({
    where: { customerEmail: fromEmail.toLowerCase(), normalizedSubject },
    orderBy: { lastMessageAt: "desc" },
    select: { id: true },
  });
  const conversation = existing
    ? await prisma.supportEmailConversation.update({ where: { id: existing.id }, data: { lastMessageAt: happenedAt, subject } })
    : await prisma.supportEmailConversation.create({ data: { customerEmail: fromEmail.toLowerCase(), subject, normalizedSubject, lastMessageAt: happenedAt } });
  await prisma.supportEmailMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "INBOUND",
      fromEmail,
      toEmail,
      subject,
      textBody: String(content.text || content.html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/giu, " ").slice(0, 100000),
      htmlBody: content.html ? String(content.html).slice(0, 200000) : null,
      resendEmailId: emailId,
      internetMessageId: clean(data.message_id) || null,
      attachmentsJson: attachments.length ? JSON.stringify(attachments) : null,
      isRead: false,
      createdAt: Number.isNaN(happenedAt.getTime()) ? new Date() : happenedAt,
    },
  });
  return { conversationId: conversation.id };
}

export async function sendOrderEmail(orderId, category, status, timelineUpdate = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { orderNo: true, customerName: true, email: true, orderPrice: true, status: true, orderItems: { select: { productName: true, quantity: true, price: true } } },
  });
  if (!order?.email) return { skipped: true };
  const title = category === "orderConfirmation"
    ? "Order received"
    : category === "deliverySuccess"
      ? "Delivery successful"
      : "Order timeline update";
  const rows = order.orderItems.map((item) => `<li>${escapeHtml(item.productName)} × ${item.quantity} — ৳${Number(item.price || 0) * Number(item.quantity || 0)}</li>`).join("");
  const timeline = timelineUpdate.title || status || order.status;
  const detail = timelineUpdate.message || `Order status changed to ${status || order.status}.`;
  const statusSummary = category === "orderConfirmation"
    ? "Your order has been received."
    : category === "deliverySuccess"
      ? "Your order has been marked as delivered."
      : `Order status: ${escapeHtml(status || order.status)}.`;
  const html = `<h2>${title}</h2><p>Hello ${escapeHtml(order.customerName)},</p><p>Order <strong>${escapeHtml(order.orderNo)}</strong>. ${statusSummary}</p>${category !== "orderConfirmation" ? `<p><strong>${escapeHtml(timeline)}</strong><br>${escapeHtml(detail)}</p>` : ""}<ul>${rows}</ul><p>Total: ৳${Number(order.orderPrice || 0)}</p>`;
  return sendConfiguredEmail({ to: order.email, subject: `${title} · ${order.orderNo}`, html, category });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
