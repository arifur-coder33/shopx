"use server";
import prisma from "@/lib/prisma";
import { revalidateTag } from "next/cache";

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
    revalidateTag("orders");
    return { success: true, data: result }; // Return success with order data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export async function getAllOrder(params) {
  try {
    const data = await prisma.order.findMany({
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
    return { success: true, data }; // Return success with product data
  } catch (error) {
    return { success: false, error: error.message }; // Return structured error
  }
}
