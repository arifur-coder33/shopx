"use server";

import { auth } from "@/auth";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { saveOrderPushSubscription, removeOrderPushSubscription, getOrderPushPublicKey, sendOrderPushTestNotification } from "@/backend/services/orderPushService";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

function getRealtimeUser(session) {
  if (!hasUIPermission(session?.user?.permissions, "order", "view")) return null;
  return session?.user?.id || null;
}

export async function createOrderRealtimeToken() {
  const session = await auth();
  const userId = getRealtimeUser(session);
  if (!userId) return { success: false, enabled: false, message: "Unauthorized" };
  const secret = process.env.AUTH_SECRET;
  if (!secret || !process.env.DATABASE_URL) return { success: true, enabled: false };
  const token = jwt.sign({ scope: "orders:view" }, secret, {
    subject: userId,
    audience: "shopzy-order-realtime",
    issuer: "shopzy",
    expiresIn: "5m",
  });
  return { success: true, enabled: true, token };
}

export async function getOrderPushConfig() {
  const session = await auth();
  if (!getRealtimeUser(session)) return { success: false, publicKey: null };
  return { success: true, publicKey: await getOrderPushPublicKey() };
}

export async function saveOrderPushSubscriptionAction(subscription) {
  const session = await auth();
  const userId = getRealtimeUser(session);
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    await saveOrderPushSubscription(userId, subscription);
    return { success: true };
  } catch (error) {
    return { success: false, message: error?.message || "Push subscription could not be saved." };
  }
}

export async function sendOrderPushTestAction(endpoint) {
  const session = await auth();
  const userId = getRealtimeUser(session);
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    const result = await sendOrderPushTestNotification(userId, endpoint);
    return { success: true, ...result };
  } catch (error) {
    return { success: false, message: error?.message || "Test push could not be sent." };
  }
}
export async function removeOrderPushSubscriptionAction(endpoint) {
  const session = await auth();
  const userId = getRealtimeUser(session);
  if (!userId) return { success: false, message: "Unauthorized" };
  try {
    await removeOrderPushSubscription(userId, endpoint);
    return { success: true };
  } catch {
    return { success: false, message: "Push subscription could not be removed." };
  }
}


export async function getOrderCardForAdminAction(orderId) {
  const session = await auth();
  if (!getRealtimeUser(session) || !orderId) return { success: false, data: null };
  const data = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true, orderNo: true, status: true, customerName: true, phoneNumber: true,
      orderPrice: true, deliveryCharge: true, paymentStatus: true, paidAmount: true,
      dueAmount: true, createdAt: true, viewedBy: true, customerConfirmedAt: true,
      fraudRiskScore: true, fraudRiskLevel: true, fraudRiskFactors: true,
      orderItems: { select: { id: true, productName: true, price: true, quantity: true, thumbnail: true } },
    },
  });
  return { success: Boolean(data), data: data ? { ...data, createdAt: data.createdAt.toISOString() } : null };
}
