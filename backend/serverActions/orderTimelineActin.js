"use server";

import prisma from "@/lib/prisma";
import { requireCurrentStoreId } from "../services/storeContextService";

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
    const storeId = await requireCurrentStoreId();
    if (!orderId) {
      throw new Error("OrderId required");
    }
    const order = await prisma.order.findUnique({
      where: { id: orderId, storeId },
      select: { id: true },
    });
    if (!order) throw new Error("Order was not found for this Store.");

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

// export async function getOrderTimeline(orderId,orderNo,phoneNumber) {
//   try {
//     if (!orderId) {
//       throw new Error("OrderId required");
//     }

//     const timeline = await prisma.orderTimeline.findMany({
//       where: { orderId },
//       orderBy: { createdAt: "desc" },
//     });

//     return { supersede: true, data: timeline };
//   } catch (error) {
//     console.error("Timeline Error:", error);
//     throw error;
//   }
// }
export async function getOrderTimeline(orderId, orderNo, phoneNumber) {
  console.log("phone", phoneNumber);
  try {
    const storeId = await requireCurrentStoreId();
    let finalOrderId = orderId;

    // orderId না থাকলে orderNo + phoneNumber দিয়ে Order খুঁজবে
    if (!finalOrderId) {
      if (!orderNo || !phoneNumber) {
        throw new Error(
          "Either orderId or both orderNo and phoneNumber are required",
        );
      }

      const order = await prisma.order.findFirst({
        where: {
          storeId,
          orderNo,
          phoneNumber,
        },
        select: {
          id: true,
        },
      });

      if (!order) {
        return {
          supersede: true,
          data: [],
        };
      }

      finalOrderId = order.id;
    }
    console.log("final order", finalOrderId);
    const timeline = await prisma.orderTimeline.findMany({
      where: {
        orderId: finalOrderId,
        order: { storeId },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      supersede: true,
      data: timeline,
    };
  } catch (error) {
    console.error("Timeline Error:", error);
    throw error;
  }
}
export async function getOrderTimelineStatus({ orderId, status }) {
  try {
    const storeId = await requireCurrentStoreId();
    if (!orderId) {
      throw new Error("OrderId required");
    }

    const timeline = await prisma.orderTimeline.findMany({
      where: { orderId, status, order: { storeId } },
      orderBy: { createdAt: "desc" },
    });

    return { supersede: true, data: timeline };
  } catch (error) {
    console.error("Timeline Error:", error);
    throw error;
  }
}
