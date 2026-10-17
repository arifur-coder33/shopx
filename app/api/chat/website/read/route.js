import { createHash } from "node:crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
      if (new URL(origin).host !== host) return Response.json({ success: false }, { status: 403 });
    } catch { return Response.json({ success: false }, { status: 403 }); }
  }
  let body;
  try { body = await request.json(); } catch { return Response.json({ success: false }, { status: 400 }); }
  const token = String(body?.token || "");
  if (!/^[a-f0-9-]{36}$/i.test(token)) return Response.json({ success: false }, { status: 400 });
  const externalUserId = createHash("sha256").update(token).digest("hex");
  const conversation = await prisma.chatConversation.findUnique({ where: { channel_externalUserId: { channel: "WEBSITE", externalUserId } }, select: { id: true } });
  if (conversation) await prisma.chatMessage.updateMany({ where: { conversationId: conversation.id, direction: "OUTBOUND", deliveryStatus: "DELIVERED" }, data: { deliveryStatus: "READ" } });
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
