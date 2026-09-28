import "server-only";
import prisma from "@/lib/prisma";
import { sendOrderPushNotification } from "./orderPushService";

export async function notifyOrderCreated(orderId) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, orderNo: true } });
    if (order) await sendOrderPushNotification(order);
  } catch {
    // Push delivery must never fail or roll back a successfully created order.
  }
}
