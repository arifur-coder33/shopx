"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";

export async function createOrder(formData) {
  try {
    const formDataObj = Object.fromEntries(formData.entries());
    const data = { ...formDataObj };
    const orderItemss = JSON.parse(data?.products);
    console.log("Order Items:", orderItemss);
    if (!data?.customerName || !data?.phoneNumber || !data?.deliveryAddress) {
      throw new Error(
        "আপনার নাম, মোবাইল নাম্বার এবং ডেলিভারি ঠিকানা সঠিকভাবে লিখুন।"
      );
    }

    // Fetch the last order number and increment it atomically
    const result = await prisma.$transaction(async (tx) => {
      // Fetch the current last order number
      let counter = await tx.orderCounter.findFirst();
      console.log("Counter:", counter);
      // If the counter doesn't exist, initialize it
      if (!counter) {
        counter = await tx.orderCounter.create({
          data: { lastOrderNumber: 240000020 },
        });
      }

      // Increment the order number
      const newOrderNumber = counter.lastOrderNumber + 1;
      console.log("New Order Number:", newOrderNumber);
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
        email: data?.email,
        city: data?.district,

        deliveryCharge: Number(data?.deliveryCharge),
        orderPrice: Number(data?.orderPrice),
        deliveryAddress: data?.deliveryAddress,
        paymentMethod: data?.paymentMethod,
        note: data?.note,
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
      console.log("Order Items:", orderItems[0].variation.combinations);
      const order = await tx.order.create({
        data: {
          ...orderData,
          orderItems: {
            create: orderItems.map((item, i) => ({
              orderNo: newOrderNumber.toString(),
              orderItemNo: i + 1,
              productName: item?.title,
              price: Number(item?.discountPrice || item?.regularPrice),
              quantity: Number(item?.quantity),
              variationId: item?.variation?.id,
              productId: item?.id,
              productCode: item?.productCode,
              sku: item?.sku,
              thumbnail: item?.mainImage,
              combinationId: item?.variation?.combinationId,
              combinations: JSON.stringify(
                (item?.variation?.combinations.length > 0 &&
                  item?.variation?.combinations.map((combination) => ({
                    name: combination.variationName.name,
                    value: combination.variationValue.value,
                  }))) ||
                  []
              ),
            })),
          },
        },
      });

      return order;
    });
    revalidatePath("/admin/order");
    revalidateTag("orders");
    console.log("Order Created:", result);
    return { success: true, data: result }; // Return success with order data
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
                thumbnail: true,
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
    console.log("Fetched Orders:", data);
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
