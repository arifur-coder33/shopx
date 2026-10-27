import { createHmac, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "@/lib/siteUrl";
import { loadChatOrderCard, renderChatOrderCard } from "@/backend/services/chatOrderCardService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const signingSecret = () => process.env.CHAT_ORDER_CARD_SECRET || process.env.AUTH_SECRET || process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY || "";

function isSignatureValid(orderNo, phoneNumber, signature) {
  if (!signingSecret() || !/^[a-f0-9]{64}$/iu.test(String(signature || ""))) return false;
  const expected = createHmac("sha256", signingSecret()).update(`${orderNo}:${phoneNumber}`).digest();
  const received = Buffer.from(signature, "hex");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const orderNo = String(params.get("o") || "").slice(0, 40);
  const signature = String(params.get("s") || "");
  if (!orderNo || !signature) return new Response("Not found", { status: 404 });
  const order = await loadChatOrderCard(orderNo);
  if (!order || !isSignatureValid(orderNo, order.phoneNumber, signature)) return new Response("Not found", { status: 404 });
  const image = await renderChatOrderCard(order, await getSiteUrl());
  return new Response(image, { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
