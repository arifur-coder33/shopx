"use server";
import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDataSelectFields } from "../utils/getDataSelectFields";

export async function createOrder(formData) {
  try {
    const formDataObj = Object.fromEntries(formData.entries());
    const data = { ...formDataObj };
    const orderItemss = JSON.parse(data?.products);

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
          data: { lastOrderNumber: 240000020 },
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
      console.log("Order Items:", orderItems);
      console.log("Order Items data:", orderItems[0].variation);
      const order = await tx.order.create({
        data: {
          ...orderData,
          orderItems: {
            create: orderItems.map((item, i) => {
              console.log("Order Item------------:", item);
              if (!item?.variation?.id) {
                throw new Error(
                  `Product "${item.title}" is missing required variation data.`
                );
              }

              return {
                orderNo: newOrderNumber.toString(),
                orderItemNo: i + 1,
                productName: item?.title,
                price: Number(item?.discountPrice || item?.regularPrice),
                quantity: Number(item?.quantity),

                productCode: item?.productCode,
                sku: item?.sku,
                thumbnail: item?.thumbnail,
                product: {
                  connect: { id: item?.id },
                },
                variation: {
                  connect: { id: item.variation.id },
                },
                combination: item?.variation?.combinationId
                  ? { connect: { id: item.variation.combinationId } }
                  : undefined,

                combinations:
                  (item?.variation?.combinations.length > 0 &&
                    JSON.stringify(
                      item?.variation?.combinations.map((combination) => ({
                        name: combination.variationName.name,
                        value: combination.variationValue.value,
                      }))
                    )) ||
                  JSON.stringify([]),
              };
            }),
          },
        },
      });

      return order;
    });

    console.log("Order Created:", result);

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
    console.log("params order", params);
    console.log("stardate:", startDate);
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
