"use server";

import prisma from "@/lib/prisma";
import { formatOrderTimelineMessage } from "@/lib/steadfastTimeline";

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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      supersede: true,
      data: timeline.map((entry) => ({ ...entry, message: formatOrderTimelineMessage(entry) })),
    };
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
