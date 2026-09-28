import { experimental_upgradeWebSocket } from "@vercel/functions";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import { subscribeToMongoChanges } from "@/lib/realtime/mongoChangeFeed";

export const runtime = "nodejs";
export const maxDuration = 300;

const ORDER_PIPELINE = [{ $match: { operationType: "insert" } }];
const ABANDONED_PIPELINE = [
  { $match: { operationType: { $in: ["insert", "update", "replace", "delete"] } } },
];

function send(ws, event, payload = {}) {
  if (ws.readyState === 1) ws.send(JSON.stringify({ event, payload }));
}

export async function GET(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return new Response("Origin not allowed", { status: 403 });
      }
    } catch {
      return new Response("Origin not allowed", { status: 403 });
    }
  }

  return experimental_upgradeWebSocket((ws) => {
    let userId = null;
    let closed = false;
    let unsubscribeOrders = null;
    let unsubscribeAbandoned = null;
    const authTimeout = setTimeout(() => {
      if (!userId && ws.readyState === 1) ws.close(1008, "Authentication required");
    }, 10000);
    const lifetimeTimeout = setTimeout(() => {
      if (ws.readyState === 1) ws.close(1000, "Reconnect");
    }, 4 * 60 * 1000);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearTimeout(authTimeout);
      clearTimeout(lifetimeTimeout);
      unsubscribeOrders?.();
      unsubscribeAbandoned?.();
      unsubscribeOrders = null;
      unsubscribeAbandoned = null;
    };

    ws.on("message", async (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (!userId) {
        if (message.type !== "auth" || !message.token) return;
        try {
          const claims = jwt.verify(message.token, process.env.AUTH_SECRET || "", {
            audience: "shopzy-order-realtime",
            issuer: "shopzy",
          });
          if (claims.scope !== "orders:view" || !claims.sub) throw new Error("Unauthorized");
          userId = claims.sub;
          clearTimeout(authTimeout);
          unsubscribeOrders = await subscribeToMongoChanges(
            "Order",
            ORDER_PIPELINE,
            async (change) => {
              const id = change.documentKey?._id?.toString();
              if (!id || closed) return;
              const order = await prisma.order.findUnique({
                where: { id },
                select: {
                  id: true, orderNo: true, status: true, customerName: true, phoneNumber: true,
                  orderPrice: true, deliveryCharge: true, paymentStatus: true, paidAmount: true,
                  dueAmount: true, createdAt: true, viewedBy: true,
                  orderItems: { select: { id: true, productName: true, price: true, quantity: true, thumbnail: true } },
                },
              });
              if (order) send(ws, "order.created", { ...order, createdAt: order.createdAt.toISOString() });
            },
          );
          if (closed) {
            unsubscribeOrders();
            return;
          }
          send(ws, "realtime:connected", { channel: "orders" });
        } catch (error) {
          const unauthorized = error?.name === "JsonWebTokenError"
            || error?.name === "TokenExpiredError"
            || error?.message === "Unauthorized";
          send(ws, "realtime:error", { code: unauthorized ? "unauthorized" : "change-stream-unavailable" });
          ws.close(unauthorized ? 1008 : 1011, unauthorized ? "Unauthorized" : "Realtime unavailable");
        }
        return;
      }

      if (message.type !== "subscribe" || message.channel !== "abandoned-checkouts" || unsubscribeAbandoned) return;
      try {
        unsubscribeAbandoned = await subscribeToMongoChanges(
          "AbandonedCheckoutLead",
          ABANDONED_PIPELINE,
          (change) => {
            const id = change.documentKey?._id?.toString();
            if (!id || closed) return;
            if (change.operationType === "delete") {
              send(ws, "abandoned-checkout.deleted", { id });
              return;
            }
            const lead = change.fullDocument;
            if (!lead) return;
            send(ws, "abandoned-checkout.updated", {
              ...lead,
              id,
              createdAt: lead.createdAt?.toISOString?.() || lead.createdAt,
              updatedAt: lead.updatedAt?.toISOString?.() || lead.updatedAt,
              lastSeenAt: lead.lastSeenAt?.toISOString?.() || lead.lastSeenAt,
            });
          },
        );
        if (closed) {
          unsubscribeAbandoned();
          return;
        }
        send(ws, "realtime:subscribed", { channel: "abandoned-checkouts" });
      } catch {
        send(ws, "realtime:channel-error", { channel: "abandoned-checkouts" });
      }
    });

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });
}
