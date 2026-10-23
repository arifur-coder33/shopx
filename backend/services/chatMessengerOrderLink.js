import { createHmac, timingSafeEqual } from "node:crypto";

function signingKey() {
  const value = process.env.PROVIDER_CREDENTIAL_ENCRYPTION_KEY;
  if (!value || value.length < 32) throw new Error("Chat order link signing key is not configured.");
  return value;
}

export function createMessengerOrderToken(conversationId, productId) {
  const payload = Buffer.from(JSON.stringify({ conversationId, productId, expiresAt: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readMessengerOrderToken(token) {
  if (typeof token !== "string" || token.length > 600) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  try {
    const expected = createHmac("sha256", signingKey()).update(payload).digest("base64url");
    if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!parsed.conversationId || !parsed.productId || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch { return null; }
}
