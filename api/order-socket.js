import { createServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { subscribeToMongoChanges } from "../lib/realtime/mongoChangeFeed.js";

const ROOM = "admin:orders";
const server = createServer();
const io = new Server(server, {
  path: "/api/order-socket/socket.io",
  transports: ["websocket"],
  serveClient: false,
  allowRequest(request, callback) {
    const host = request.headers.host;
    const origin = request.headers.origin;
    if (!host || !origin) return callback("Origin not allowed", false);
    try { callback(null, new URL(origin).host === host); }
    catch { callback("Origin not allowed", false); }
  },
});

io.use((socket, next) => {
  try {
    const secret = process.env.AUTH_SECRET;
    if (!secret) return next(new Error("Realtime auth is not configured."));
    const claims = jwt.verify(socket.handshake.auth?.token || "", secret, {
      audience: "shopzy-order-realtime", issuer: "shopzy",
    });
    if (claims.scope !== "orders:view" || !claims.sub) return next(new Error("Unauthorized"));
    socket.data.userId = claims.sub;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

let orderWatcherPromise;

function startOrderWatcher() {
  if (orderWatcherPromise) return orderWatcherPromise;
  orderWatcherPromise = subscribeToMongoChanges("Order", [{ $match: { operationType: "insert" } }], async (change) => {
    const id = change.documentKey?._id?.toString();
    if (!id) return;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true, orderNo: true, status: true, customerName: true, phoneNumber: true,
        orderPrice: true, deliveryCharge: true, paymentStatus: true, paidAmount: true,
        dueAmount: true, createdAt: true, viewedBy: true,
        orderItems: { select: { id: true, productName: true, price: true, quantity: true, thumbnail: true } },
      },
    });
    if (order) io.to(ROOM).emit("order.created", { ...order, createdAt: order.createdAt.toISOString() });
  }).catch((error) => {
    orderWatcherPromise = null;
    throw error;
  });
  return orderWatcherPromise;
}

io.on("connection", (socket) => {
  socket.join(ROOM);
  const expiryTimer = setTimeout(() => socket.disconnect(true), 4 * 60 * 1000);
  startOrderWatcher()
    .then(() => socket.emit("realtime:connected", { channel: "orders" }))
    .catch(() => socket.emit("realtime:error", { code: "change-stream-unavailable" }));
  socket.on("disconnect", () => clearTimeout(expiryTimer));
});

export default server;
