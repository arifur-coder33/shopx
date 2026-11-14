import { createHmac, timingSafeEqual } from "node:crypto";
import { getEmailConfiguration, storeReceivedEmail } from "@/backend/services/emailService";

export const runtime = "nodejs";

function verifyWebhook(rawBody, headers, secret) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");
  if (!id || !timestamp || !signature || !secret) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    const actualBytes = Buffer.from(value);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  });
}

export async function POST(request) {
  const rawBody = await request.text();
  const settings = await getEmailConfiguration();
  if (!verifyWebhook(rawBody, request.headers, settings.webhookSigningSecret)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  let event;
  try { event = JSON.parse(rawBody); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (event.type !== "email.received") return Response.json({ received: true });
  const emailId = event.data?.email_id;
  if (!emailId) return Response.json({ error: "Missing email id." }, { status: 400 });
  if (!settings.resendApiKey) return Response.json({ error: "Resend API key is not configured." }, { status: 503 });
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
    headers: { Authorization: `Bearer ${settings.resendApiKey}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return Response.json({ error: "Could not retrieve received email from Resend." }, { status: 502 });
  const content = await response.json();
  await storeReceivedEmail(event.data, content.data || content);
  return Response.json({ received: true });
}
