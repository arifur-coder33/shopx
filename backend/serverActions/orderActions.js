"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDataSelectFields } from "../utils/getDataSelectFields";

export async function createOrder(formData) {
  try {
    const formDataObj = Object.fromEntries(formData.entries());
    const data = { ...formDataObj };
    const orderItems = JSON.parse(data?.products);

    return null;
    if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।"
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
          customerName: data.customerName,
          phoneNumber: data.phoneNumber,
          email: data.email,
          city: data.district,
          deliveryCharge: Number(data.deliveryCharge),
          orderPrice: Number(data.orderPrice),
          deliveryAddress: data.deliveryAddress,
          paymentMethod: data.paymentMethod,
          note: data.note,
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
            `${item.title} product stock not available. We have only ${variation.stock}.`
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
              })) || []
            ),
          },
        });
      }

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

export async function getAllOrder(params) {
  try {
    const {
      limit = 10,
      cursor,
      tableProperties,
      sortField = "createdAt",
      sortDirection = "desc",
      // ...other filters
      orderNo,
      sku,
      phoneNumber,
      status,
      startDate,
      endDate,
    } = params;

    const whereClause = {};
    if (orderNo)
      whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (sku) {
      whereClause.orderItems = {
        some: { sku: { contains: sku, mode: "insensitive" } },
      };
    }
    if (phoneNumber) {
      whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
    }

    const selectFields = getDataSelectFields(tableProperties);

    const requestedLimit = Number(limit);
    const items = await prisma.order.findMany({
      take: requestedLimit + 1,
      where: whereClause,
      select: selectFields,
      cursor: cursor ? { id: cursor } : undefined,
      // The `skip: 1` is NECESSARY and CORRECT for Prisma's cursor implementation
      // to exclude the cursor itself and start on the next record.
      skip: cursor ? 1 : 0,
      orderBy: { [sortField]: sortDirection },
    });

    let nextCursor = null;
    // Check if we received more items than the requested page size.
    if (items.length > requestedLimit) {
      // --- THE CRITICAL FIX IS HERE ---
      // 1. Remove the extra item that we fetched only to check for a next page.
      items.pop();

      // 2. The new cursor is the ID of the LAST item in the *remaining* array.
      nextCursor = items[items.length - 1].id;
    }

    return {
      success: true,
      data: items,
      nextCursor: nextCursor,
    };
  } catch (error) {
    console.error("Failed to get orders:", error);
    return { success: false, error: error.message };
  }
}

export async function getOrderCount(params) {
  try {
    const { orderNo, sku, phoneNumber, status, startDate, endDate } = params;

    const whereClause = {};
    if (orderNo)
      whereClause.orderNo = { contains: orderNo, mode: "insensitive" };
    if (status) whereClause.status = status;
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (sku) {
      whereClause.orderItems = {
        some: { sku: { contains: sku, mode: "insensitive" } },
      };
    }
    if (phoneNumber) {
      whereClause.phoneNumber = { contains: phoneNumber, mode: "insensitive" };
    }

    const count = await prisma.order.count({
      where: whereClause,
    });

    return { success: true, count };
  } catch (error) {
    console.error("Failed to get order count:", error);
    return { success: false, error: error.message };
  }
}
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
    return { success: true, data };
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
    const result = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status,
      },
    });

    revalidatePath("/admin/order");
    revalidateTag("order");
    return {
      success: true,
      message: "Order Status Updated",
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || "Failed to Update order",
    };
  } finally {
    await prisma.$disconnect();
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
  } finally {
    await prisma.$disconnect();
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

      // ❗ Already canceled হলে আবার stock add করবে না
      if (order.status === "CANCELED" || order.status === "RETURNED") {
        throw new Error("Order already canceled/returned");
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
          status: cancelReasonType === "cancel" ? "CANCELED" : "RETURNED",
        },
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
