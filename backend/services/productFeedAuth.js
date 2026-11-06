import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function authorizeProductFeed(request) {
  const unauthorized = () => new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Product feed", charset="UTF-8"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  const header = request.headers.get("authorization") || "";
  const match = /^Basic\s+([A-Za-z0-9+/]+=*)$/iu.exec(header);
  if (!match) return unauthorized();

  let decoded;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return unauthorized();
  }
  const separator = decoded.indexOf(":");
  if (separator < 1) return unauthorized();
  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  const setting = await prisma.socialTrackingSetting.findUnique({
    where: { id: "SOCIAL_TRACKING" },
    select: { productFeedUsername: true, productFeedPasswordHash: true },
  });
  if (!setting?.productFeedUsername || !setting.productFeedPasswordHash || username !== setting.productFeedUsername) {
    return unauthorized();
  }
  const valid = await bcrypt.compare(password, setting.productFeedPasswordHash);
  return valid ? null : unauthorized();
}

export function protectedFeedResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", "Authorization");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
