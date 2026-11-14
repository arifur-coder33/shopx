import { sendConfiguredEmail } from "@/backend/services/emailService";

export async function sendMail({ to, subject, html, text, category }) {
  return sendConfiguredEmail({ to, subject, html, text, category });
}
