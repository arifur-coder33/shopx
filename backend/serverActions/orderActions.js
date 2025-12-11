"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { notifyNewOrder } from "../utils/mesage/orderSMS";

export async function createOrder(formData) {
  try {
    const formDataObj = Object.fromEntries(formData.entries());
    const data = { ...formDataObj };

    console.log(data);

    if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।"
      );
    }

    // Fetch the last order number and increment it atomically
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the current last order number
      let counter = await tx.orderCounter.findFirst();

      // If the counter doesn't exist, initialize it
      if (!counter) {
        counter = await tx.orderCounter.create({
          data: { lastOrderNumber: 24000000 },
        });
      }

      // Increment the order number
      const newOrderNumber = counter.lastOrderNumber + 1;

      // Update the counter with the new number
      await tx.orderCounter.update({
        where: { id: counter?.id },
        data: { lastOrderNumber: newOrderNumber },
      });

      // Create the order with the new order number
      const orderData = {
        orderNo: newOrderNumber.toString(),
        customerName: data?.customerName,
        phoneNumber: data?.phoneNumber,
        deliveryCharge: Number(data?.deliveryCharge),
        orderPrice: Number(data?.orderPrice),
        deliveryArea: data?.deliveryArea,
        deliveryAddress: data?.deliveryAddress,
        orderNotes: data?.orderNotes,
        email: data?.email,
        paymentMethod: data?.paymentMethod,
      };
      const orderItems = JSON.parse(data?.products);
      // const order = await tx.order.create({
      //   data: {
      //     ...data,
      //     orderItemNo: 1,
      //     quantity: Number(data?.quantity),
      //     deliveryCharge: Number(data?.deliveryCharge),
      //     orderPrice: Number(data?.orderPrice),
      //     orderNo: newOrderNumber.toString(),
      //   },
      // });

      const order = await tx.order.create({
        data: {
          ...orderData,
          orderItems: {
            create: orderItems.map((item, i) => ({
              orderNo: newOrderNumber.toString(),
              orderItemNo: i + 1,
              productName: item?.productName,
              price: Number(item?.price),
              quantity: Number(item?.quantity),
              productColor: item?.productColor,
              productSize: item?.productSize,
              productId: item?.productId,
            })),
          },
        },
      });

      return order;
    });
    revalidatePath("/admin/order");
    revalidateTag("orders");
    await notifyNewOrder(result);

    // Promise.all([
    //   notifyNewOrder(result),
    //   revalidatePath("/admin/order"),
    //   revalidateTag("orders"),
    // ]);

    return {
      success: true,
      data: { orderNo: result.orderNo, phoneNumber: result.phoneNumber },
    };
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getAllOrder(params) {
  try {
    const { status, orderNo, startDate, endDate } = params || {};

    // Build the where clause dynamically based on provided filters
    const whereClause = {};

    if (status) {
      whereClause.status = status; // Filter by order status
    }

    if (orderNo) {
      whereClause.orderNo = orderNo; // Filter by order number
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate); // Filter orders created after startDate
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate); // Filter orders created before endDate
      }
    }

    // Fetch orders with filters applied
    const data = await prisma.order.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: "desc", // Sort by most recent orders
      },
      skip: 0, // Start from the first record
      take: 10, // Limit to 10 orders
    });

    return { success: true, data: data };
  } catch (error) {
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
    console.log(data);
    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
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

export async function updateOrderStatusAction(orderId, status) {
  console.log(`order id : ${orderId}`);
  console.log(`order status : ${status}`);
  try {
    const result = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status,
      },
    });
    console.log(result);
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
