"use server";

import prisma from "@/lib/prisma";

export async function addOrderTimeline({
  orderId,
  orderNo,
  status,
  title,
  message,
  createdBy = "system",
  createdAt,
}) {
  try {
    if (!orderId) {
      throw new Error("OrderId required");
    }

    const timeline = await prisma.orderTimeline.create({
      data: {
        orderId,
        orderNo,
        status,
        title,
        message,
        createdBy,
        createdAt: createdAt ? new Date(createdAt) : new Date(),
      },
    });

    return timeline;
  } catch (error) {
    console.error("Timeline Error:", error);
    throw error;
  }
}

export async function getOrderTimeline(orderId) {
  try {
    if (!orderId) {
      throw new Error("OrderId required");
    }

    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });

    return { supersede: true, data: timeline };
  } catch (error) {
    console.error("Timeline Error:", error);
    throw error;
  }
}

export async function getOrderTimelineStatus({ orderId, status }) {
  try {
    if (!orderId) {
      throw new Error("OrderId required");
    }

    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId, status },
      orderBy: { createdAt: "desc" },
    });

    return { supersede: true, data: timeline };
  } catch (error) {
    console.error("Timeline Error:", error);
    throw error;
  }
}
