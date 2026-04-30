"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { getIP } from "../utils/getIp";
import { getListCount } from "../utils/getListCount";
import { getListData } from "../utils/getListData";
import { getUserId } from "../utils/hasPermission";
import { addOrderTimeline } from "./orderTimelineActin";
import { firePurchaseServer } from "./SocialPurchaseEventAction";
const statusMap = {
  all: null, // no filter
  running: [
    "PENDING",
    "PROCESSING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERY_FAILED",
  ],
  cancelled: ["CANCELLED", "FAILED_RETURNING", "FAILED_RETURN_RECEIVED"],
  delivered: ["DELIVERED", "RETURNING", "RETURNED"],
  refunded: ["REFUNDING", "REFUNDED"],
};
export async function createOrder(formData) {
  const h = await headers();
  const ip = getIP(h);

  try {
    const userId = await getUserId(); // Ensure user is authenticated, will throw if not
    const formDataObj = Object.fromEntries(formData.entries());
    const data = { ...formDataObj };
    const orderItems = JSON.parse(data?.products);

    if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।",
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Get or create counter
      let counter = await tx.orderCounter.findFirst();

      if (!counter) {
        counter = await tx.orderCounter.create({
          data: { lastOrderNumber: 240000020 },
        });
      }

      const newOrderNumber = counter.lastOrderNumber + 1;

      await tx.orderCounter.update({
        where: { id: counter.id },
        data: { lastOrderNumber: newOrderNumber },
      });

      // 2️⃣ Create Order
      const order = await tx.order.create({
        data: {
          orderNo: newOrderNumber.toString(),
          userId: userId || null,
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          city: data.district,
          deliveryCharge: Number(data.deliveryCharge),
          orderPrice: Number(data.orderPrice),
          deliveryAddress: data.deliveryAddress,
          paymentMethod: data.paymentMethod,
          note: data?.note,
          fbc: data?.fbc,
          fbp: data?.fbp,
          gclid: data?.gclid,
          ttclid: data?.ttclid,

          userAgent: data?.userAgent,
          ipAddress: ip,
        },
      });

      // 3️⃣ Create Order Items
      for (let i = 0; i < orderItems.length; i++) {
        const item = orderItems[i];

        if (!item?.variation?.id) {
          throw new Error(`Product "${item.title}" variation missing`);
        }

        // 🔻 Stock check
        const variation = await tx.productVariation.findUnique({
          where: { id: item.variation.id },
          select: { stock: true },
        });

        if (variation.stock < item.quantity) {
          throw new Error(
            `${item.title} product stock not available. We have only ${variation.stock}.`,
          );
        }

        // 🔻 Stock minus
        await tx.productVariation.update({
          where: { id: item.variation.id },
          data: {
            stock: {
              decrement: Number(item.quantity),
            },
          },
        });

        // 4️⃣ Create OrderItem
        await tx.orderItem.create({
          data: {
            orderNo: newOrderNumber.toString(),
            orderItemNo: i + 1,
            productName: item.title,
            price: Number(item.discountPrice || item.regularPrice),
            quantity: Number(item.quantity),
            productCode: item.productCode,
            sku: item.sku,
            thumbnail: item.thumbnail,

            product: {
              connect: { id: item.id },
            },
            variation: {
              connect: { id: item.variation.id },
            },
            order: {
              connect: { id: order.id },
            },
            combination: item.variation.combinationId
              ? { connect: { id: item.variation.combinationId } }
              : undefined,

            combinations: JSON.stringify(
              item.variation.combinations?.map((c) => ({
                name: c.variationName.name,
                value: c.variationValue.value,
              })) || [],
            ),
          },
        });
      }
      await addOrderTimeline({
        orderId: order.id,
        orderNo: newOrderNumber.toString(),
        status: "PENDING",
        title: "Order Created",
        message: "Your order has been created and is pending confirmation.",
        createdBy: "user",
      });
      return order;
    });

    Promise.all([
      // notifyNewOrder(result).catch((err) => console.error("SMS error:", err)),
      revalidatePath("/admin/orders"),
      revalidateTag("orders"),
    ]);
    return { success: true, data: result }; // Return success with order data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

// A helper to dynamically create the 'select' object for Prisma
// This ensures we only fetch data that the table actually needs.

// export async function getAllOrder(params) {
//   try {
//     const {
//       limit = 10,
//       cursor,
//       tableProperties,
//       sortField = "createdAt",
//       sortDirection = "desc",
//       // ...other filters
//       orderNo,
//       sku,
//       phoneNumber,
//       status,
//       startDate,
//       endDate,
//     } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const selectFields = getDataSelectFields(tableProperties);

//     const requestedLimit = Number(limit);
//     const items = await prisma.order.findMany({
//       take: requestedLimit + 1,
//       where: whereClause,
//       select: selectFields,
//       cursor: cursor ? { id: cursor } : undefined,
//       // The `skip: 1` is NECESSARY and CORRECT for Prisma's cursor implementation
//       // to exclude the cursor itself and start on the next record.
//       skip: cursor ? 1 : 0,
//       orderBy: { [sortField]: sortDirection },
//     });

//     let nextCursor = null;
//     // Check if we received more items than the requested page size.
//     if (items.length > requestedLimit) {
//       // --- THE CRITICAL FIX IS HERE ---
//       // 1. Remove the extra item that we fetched only to check for a next page.
//       items.pop();

//       // 2. The new cursor is the ID of the LAST item in the *remaining* array.
//       nextCursor = items[items.length - 1].id;
//     }

//     return {
//       success: true,
//       data: items,
//       nextCursor: nextCursor,
//     };
//   } catch (error) {
//     console.error("Failed to get orders:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function getAllOrder(params) {
  return getListData({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" }, // ✅ ENUM safe
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
  });
}

export async function getOrderCount(params) {
  return getListCount({
    prisma,
    model: "order",
    params,
    searchableFields: [
      { field: "orderNo", type: "string", mode: "sensitive" },
      { field: "phoneNumber", type: "string", mode: "sensitive" },
      { field: "status", type: "enum" },
    ],
    relationSearch: {
      sku: {
        relation: "orderItems",
        field: "sku",
        type: "string",
        mode: "sensitive",
      },
    },
    dateField: "createdAt",
  });
}

// export async function getOrderCount(params) {
//   try {
//     const { orderNo, sku, phoneNumber, status, startDate, endDate } = params;

//     const whereClause = {};
//     if (orderNo)
//       whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
//     if (status) whereClause.status = status;
//     if (startDate && endDate) {
//       whereClause.createdAt = {
//         gte: new Date(startDate),
//         lte: new Date(endDate),
//       };
//     }
//     if (sku) {
//       whereClause.orderItems = {
//         some: { sku: { contains: sku, mode: "insensitive" } },
//       };
//     }
//     if (phoneNumber) {
//       whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
//     }

//     const count = await prisma.order.count({
//       where: whereClause,
//     });

//     return { success: true, count };
//   } catch (error) {
//     console.error("Failed to get order count:", error);
//     return { success: false, error: error.message };
//   }
// }
export async function getOrderByOrderNo(orderNo, phoneNumber) {
  try {
    const data = await prisma.order.findUnique({
      where: { orderNo: orderNo, phoneNumber },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                mainImage: true,
              },
            },
          },
        },
      },
    });

    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getOrderById(orderId) {
  try {
    const data = await prisma.order.findUnique({
      where: { id: orderId },

      include: {
        orderItems: {
          include: {
            variation: true,
            combination: true,
          },
        },
        shipping: true,
      },
    });
    console.log("Fetched order by ID:", data);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getOrders({ userId, status, page = 1, limit = 10 }) {
  try {
    const skip = (page - 1) * limit;

    let where = { userId };

    if (status && status !== "all") {
      const dbStatuses = statusMap[status.toLowerCase()];
      if (dbStatuses && dbStatuses.length) {
        where.status = { in: dbStatuses };
      }
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: {
            include: { variation: true, combination: true },
          },
          shipping: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
export async function deleteOrderById(orderId) {
  try {
    // Delete the order by its ID
    const deletedOrder = await prisma.order.delete({
      where: {
        id: orderId,
      },
    });
    revalidatePath("/admin/order");
    revalidateTag("order");
    return {
      success: true,
      data: "Order and associated items deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting order:", error);
    return {
      success: false,
      message: error.message || "Failed to delete order",
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function updateOrderStatusAction(orderId, status, note) {
  try {
    // 🔎 get order first (for orderNo + old status)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, orderNo: true, id: true, paymentMethod: true },
    });

    if (!order) {
      throw new Error("Order not found");
    }

    // ❌ duplicate same status prevent
    if (order.status === status) {
      return {
        success: true,
        message: "Status already updated",
      };
    }

    // ✅ update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
      },
    });

    // 🧠 dynamic title বানানো
    const titleMap = {
      PENDING: "Order Placed",
      PROCESSING: "Processing Order",
      READY_TO_SHIP: "Ready to Ship",
      SHIPPED: "Order Shipped",
      DELIVERED: "Order Delivered",

      DELIVERY_FAILED: "Delivery Failed",
      FAILED_RETURNING: "Delivery Failed item Returning",
      FAILED_RETURN_RECEIVED: "Delivery Failed item Received",
      CANCELLED: "Order Cancelled",
      RETURNING: "Returning",
      RETURNED: "Returned",
      REFUNDING: "Refund Processing",
      REFUNDED: "Refund Completed",
    };

    // ✅ timeline add
    await addOrderTimeline({
      orderId: order.id,
      orderNo: order.orderNo,
      status,
      title: titleMap[status] || "Status Updated",
      message: note || `Order status changed to ${status}`,
      createdBy: "admin",
    });
    if (order.paymentMethod === "cod" && status === "DELIVERED") {
      firePurchaseServer(orderId).catch((err) =>
        console.error("Tracking failed:", err),
      );
    }

    // 🔄 revalidate
    revalidatePath("/admin/orders");
    revalidateTag("order");

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}
export async function updateOrderExtraDiscountAction({
  orderId,
  adminNote,
  adminDiscount,
}) {
  try {
    if (!orderId) {
      throw new Error("Order ID is required");
    }
    const checkOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!checkOrder) {
      throw new Error("Order not found");
    }
    const result = await prisma.order.update({
      where: { id: orderId },
      data: {
        adminNote: adminNote,
        adminDiscount: Number(adminDiscount),
      },
    });

    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  }
}

export async function cancelOrderById({
  orderId,
  cancelReason,
  cancelReasonType,
}) {
  try {
    await prisma.$transaction(async (tx) => {
      // 1️⃣ Order + items load
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            select: {
              quantity: true,
              variationId: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      // ❗ Already CANCELLED হলে আবার stock add করবে না
      if (order.status === "CANCELLED" || order.status === "RETURNED") {
        throw new Error("Order already CANCELLED/returned");
      }

      // 2️⃣ Stock restore
      for (const item of order.orderItems) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: {
            stock: {
              increment: item.quantity, // ✅ stock back
            },
          },
        });
      }

      // 3️⃣ Update order status
      await tx.order.update({
        where: { id: orderId },
        data: {
          cancelReason: cancelReason || "",
          cancelReasonType: cancelReasonType || "",
          status: "CANCELLED",
        },
      });

      await addOrderTimeline({
        orderId,
        orderNo: order.orderNo,
        status: "CANCELLED",
        title: cancelReasonType,
        message: cancelReason,

        createdBy: "system",
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling order:", error);
    return {
      success: false,
      message: error.message || "Failed to cancel order",
    };
  }
}

export async function processRefundAction({ orderId, method, trxId, note }) {
  try {
    if (!orderId) throw new Error("Order ID required");

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new Error("Order not found");
    if (order.status === "REFUNDED") throw new Error("Already refunded");
    if (!["RETURNED", "REFUNDING"].includes(order.status))
      throw new Error("Refund not allowed in this status");

    const refundAmount = order.orderPrice - (order.adminDiscount || 0);

    const refun = await prisma.$transaction([
      // 1️⃣ Update order status
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "REFUNDED", // ✅ শুধু status update
        },
      }),

      // 2️⃣ Create refund record
      prisma.refund.create({
        data: {
          orderId,
          amount: refundAmount,
          method,
          trxId,
          note,
          status: "COMPLETED",
        },
      }),

      // 3️⃣ Timeline add
      prisma.orderTimeline.create({
        data: {
          orderId,
          orderNo: order.orderNo,
          status: "REFUNDED",
          title: "Refund processed",
          message: `Refund via ${method} (${trxId || "no trx"})`,
          createdBy: "admin",
        },
      }),
    ]);

    console.log("Refund transaction result:", refun);

    // 🔄 Revalidate paths
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);

    return { success: true, message: "Refund completed successfully" };
  } catch (error) {
    console.error("Error processing refund:", error);
    return { success: false, message: error.message || "Refund failed" };
  }
}

export async function getOrderCountsbyUserId(userId) {
  const allOrders = await prisma.order.groupBy({
    by: ["status"],
    where: { userId },
    _count: { status: true },
  });

  const counts = {
    all: 0,
    running: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };

  console.log("Grouped order counts:", allOrders);
  allOrders.forEach((o) => {
    counts.all += o._count.status;

    // Map Prisma enum to dashboard category
    if (
      ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED"].includes(o.status)
    ) {
      counts.running += o._count.status;
    } else if (o.status === "DELIVERED") {
      counts.delivered += o._count.status;
    } else if (o.status === "CANCELLED") {
      counts.cancelled += o._count.status;
    } else if (["REFUNDING", "REFUNDED"].includes(o.status)) {
      counts.refunded += o._count.status;
    }
  });

  return counts;
}
