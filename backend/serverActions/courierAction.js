"use server";

import prisma from "@/lib/prisma";
import { createPathaoOrder } from "../lib/pathao";
import { updateOrderStatusAction } from "./orderActions";

export async function createCourierDeliveryAction({ formData }) {
  // Simulate API call to create a courier delivery
  try {
    let data = Object.fromEntries(formData.entries());

    const order = await prisma.order.findUnique({
      where: { orderNo: data.invoice },
      select: { id: true },
    });

    if (!order) {
      return {
        success: false,
        message: "No order found with the provided invoice number.",
      };
    }
    const courierName = data.courierName;

    let courierData = {};
    let orderResponseData = null;
    switch (courierName) {
      case "pathao":
        courierData = {
          store_id: Number(data.storeId),
          merchant_order_id: data.invoice,
          recipient_name: data.name,
          recipient_phone: data.phone,
          recipient_address: data.address,
          delivery_type: data.deliveryType === "express" ? 12 : 48, // 48 for Normal Delivery, 12 for On Demand Delivery
          item_type: data.itemType || 2, // 1 for Document, 2 for Parcel
          special_instruction: data.note || "",
          item_quantity: data.quantity || 1,
          item_weight: data.weight || 0.5,
          item_description: data.item_description || "Goods",
          amount_to_collect: data.price || 0,
        };

        const response = await createPathaoOrder(courierData);

        if (response.code === 200) {
          orderResponseData = {
            cn: response.data?.consignment_id,
            status: response.data.order_status,
            date: new Date().toLocaleDateString(),
            courierName: "Pathao",
            storeName: data?.storeName || "",
            deliveryFee: response.data.delivery_fee,
            merchantOrderId: response.data.merchant_order_id,
            tracking_url: `https://pcom.page.link/${response.data?.consignment_id}`,
          };
        } else {
          throw new Error("❌ Failed to create Pathao order");
        }

        break;
      case "Shohoz":
        courierData = {
          service: "Shohoz",
          tracking_url: "https://shohoship.com/track/",
        };
        break;
      default:
        orderResponseData = {
          cn: data?.cn || "N/A",
          status: "READY_TO_SHIP",
          date: new Date().toLocaleDateString(),
          courierName: courierName,
          storeName: data?.storeName || "",
          deliveryFee: data?.deliveryFee || 0,
          merchantOrderId: data.invoice || "N/A",
          tracking_url: "#",
        };

        break;
    }

    await prisma.shipping.create({
      data: {
        orderId: order.id,
        orderNo: data.invoice,
        cn: orderResponseData.cn,
        courierName: orderResponseData.courierName,
        deliveryFee: orderResponseData.deliveryFee,
        cod: Number(data.price) || 0,
      },
    });
    await updateOrderStatusAction(order.id, "READY_TO_SHIP");

    return { success: true, data: orderResponseData || courierData };
  } catch (error) {
    console.error("Error creating courier delivery:", error);
    return { success: false, message: error.message };
  }
}

export async function cancelCourierDeliveryAction(courierId, orderId) {
  // Simulate API call to cancel a courier delivery
  try {
    if (!courierId || !orderId) {
      throw new Error(
        "Courier ID and Order ID are required to cancel delivery."
      );
    }
    const checkShipping = await prisma.shipping.findUnique({
      where: { id: courierId },
    });
    if (!checkShipping) {
      throw new Error("No shipping found with the provided courier ID.");
    }
    await prisma.shipping.delete({
      where: { id: courierId },
    });
    await updateOrderStatusAction(orderId, "PROCESSING");
    return { success: true, data: { status: "PROCESSING" } };
  } catch (error) {
    console.error("Error cancelling courier delivery:", error);
    return { success: false, message: error.message };
  }
}
