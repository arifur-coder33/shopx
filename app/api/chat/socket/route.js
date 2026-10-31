import { experimental_upgradeWebSocket } from "@vercel/functions";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export const runtime = "nodejs";
export const maxDuration = 300;

function send(ws, event, payload = {}) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ event, payload }));
}

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

export async function GET(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) return new Response("Origin not allowed", { status: 403 });
    } catch { return new Response("Origin not allowed", { status: 403 }); }
  }

  return experimental_upgradeWebSocket((ws) => {
    let authenticated = false;
    let conversationId = null;
    let closed = false;
    let pollTimer = null;
    let cursorAt = new Date(Date.now() - 2000);
    let cursorId = "";
    const seenIds = new Set();
    const authTimer = setTimeout(() => {
      if (!authenticated && ws.readyState === 1) ws.close(1008, "Authentication required");
    }, 10000);
    const lifetimeTimer = setTimeout(() => {
      if (ws.readyState === 1) ws.close(1000, "Reconnect");
    }, 4 * 60 * 1000);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearTimeout(authTimer);
      clearTimeout(lifetimeTimer);
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    };

    const pollMessages = async () => {
      if (closed || !authenticated) return;
      try {
        const messages = await prisma.chatMessage.findMany({
          where: {
            ...(conversationId && { conversationId }),
            updatedAt: { gte: cursorAt },
            OR: [
              { updatedAt: { gt: cursorAt } },
              { updatedAt: cursorAt, id: { gt: cursorId } },
            ],
          },
          orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
          take: 100,
          select: {
            id: true,
            conversationId: true,
            direction: true,
            content: true,
            updatedAt: true,
            conversation: {
              select: { customerName: true, customerPhone: true, channel: true },
            },
          },
        });
        for (const message of messages) {
          const eventKey = `${message.id}:${message.updatedAt.getTime()}`;
          if (seenIds.has(eventKey)) continue;
          seenIds.add(eventKey);
          send(ws, "chat.message", {
            id: message.id,
            conversationId: message.conversationId,
            direction: message.direction,
            ...(message.direction === "INBOUND" && {
              content: message.content,
              customerName: message.conversation.customerName,
              customerPhone: message.conversation.customerPhone,
              channel: message.conversation.channel,
            }),
            updatedAt: message.updatedAt.toISOString(),
          });
          cursorAt = message.updatedAt;
          cursorId = message.id;
        }
        while (seenIds.size > 500) seenIds.delete(seenIds.values().next().value);
      } catch (error) {
        console.warn("Chat realtime polling failed:", error?.message || error);
        send(ws, "realtime:error", { code: "chat-poll-unavailable" });
      }
    };

    ws.on("message", async (raw) => {
      if (authenticated) return;
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (!message.token) return;
      try {
        let channel = "admin-chat";
        if (message.type === "website-auth") {
          if (!/^[a-f0-9-]{36}$/i.test(message.token)) throw new Error("Unauthorized");
          const conversation = await prisma.chatConversation.findUnique({
            where: { channel_externalUserId: { channel: "WEBSITE", externalUserId: hashToken(message.token) } },
            select: { id: true },
          });
          if (!conversation) throw new Error("Unauthorized");
          conversationId = conversation.id;
          channel = "website-chat";
        } else {
          if (message.type !== "auth") throw new Error("Unauthorized");
          const claims = jwt.verify(message.token, process.env.AUTH_SECRET || "", {
            audience: "shopzy-chat-realtime",
            issuer: "shopzy",
          });
          if (claims.scope !== "chat:realtime" || !claims.sub) throw new Error("Unauthorized");
          const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, role: { select: { name: true, permissions: { where: { allowed: true }, select: { resource: { select: { key: true } }, action: { select: { key: true } } } } } } } });
          const permissions = user?.role?.name === "SUPER_ADMIN" ? ["*"] : user?.role?.permissions?.map((item) => `${item.resource.key}:${item.action.key}`) || [];
          if (!user || !hasUIPermission(permissions, "chatInbox", "view")) throw new Error("Unauthorized");
        }
        authenticated = true;
        clearTimeout(authTimer);
        send(ws, "realtime:connected", { channel });
        await pollMessages();
        pollTimer = setInterval(pollMessages, 1000);
      } catch (error) {
        send(ws, "realtime:error", { code: "unauthorized" });
        ws.close(1008, "Unauthorized");
      }
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });
}
