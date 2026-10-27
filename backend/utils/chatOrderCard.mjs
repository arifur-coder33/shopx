import { createHmac } from "node:crypto";

export function signedChatOrderCardUrl(orderNo, phoneNumber, siteUrl) {
  const secret = process.env.CHAT_ORDER_CARD_SECRET || process.env.AUTH_SECRET || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY;
  if (!secret || !orderNo || !phoneNumber) return null;
  const signature = createHmac("sha256", secret).update(`${orderNo}:${phoneNumber}`).digest("hex");
  const url = new URL("/api/chat/order-card", siteUrl);
  url.searchParams.set("o", orderNo);
  url.searchParams.set("s", signature);
  return url.href;
}
