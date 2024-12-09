"use server";
import prisma from "@/lib/prisma";
import { revalidateTag, unstable_cache } from "next/cache";

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
    if (!data?.productId) {
      throw new Error(
        "কোন একটি সমস্যা হয়েছে। দয়া করে কিছুক্ষন আবার চেষ্টা করুন।"
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
      const order = await tx.order.create({
        data: {
          ...data,
          orderItemNo: 1,
          quantity: Number(data?.quantity),
          deliveryCharge: Number(data?.deliveryCharge),
          orderPrice: Number(data?.orderPrice),
          orderNo: newOrderNumber.toString(),
        },
      });

      return order;
    });
revalidateTag('orders')
    return { success: true, data: result }; // Return success with order data
  } catch (error) {
    console.log(error.message);
    return { success: false, error: error.message }; // Return structured error
  }
}

export const getAllOrders = unstable_cache(
  async () => {
  try {
   const data=await prisma.order.findMany();

    return { success: true, data:data };
  } catch (error) {
    return { success: false, error: error.message };
  }
  },
  ["orders"],
  { revalidate: 3600, tags: ["orders"] }
);
