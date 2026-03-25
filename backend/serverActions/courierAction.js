"use server";

import prisma from "@/lib/prisma";
import {
  createSteadfastOrder,
  getSteadfastDeliveryStatus,
} from "../lib/courier/steadfast";
import { createPathaoOrder, getPathaoOrderInfo } from "../lib/pathao";
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
      case "steadfast":
        courierData = {
          invoice: data.invoice,
          recipient_name: data.name,
          recipient_phone: data.phone,
          recipient_address: data.address,
          cod_amount: Number(data.price) || 0,
          note: "Call before delivery",
        };
        const steadfastResponse = await createSteadfastOrder(courierData);
        console.log("Steadfast Response:", steadfastResponse);
        if (steadfastResponse.success) {
          console.log(
            "Steadfast order created successfully",
            steadfastResponse?.data?.consignment_id.toString(),
          );
          orderResponseData = {
            cn: steadfastResponse?.data?.consignment_id.toString(),
            status: steadfastResponse?.data?.status,
            date: steadfastResponse?.data?.created_at,
            courierName: "Steadfast",
            storeName: data?.storeName || "",

            merchantOrderId: "N/A",
          };
        } else {
          throw new Error(
            steadfastResponse.error || "Failed to create Steadfast order",
          );
        }

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
        };

        break;
    }
    console.log("Order Response Data:", orderResponseData);
    const shippingdata = await prisma.shipping.create({
      data: {
        orderId: order.id,
        orderNo: data.invoice,
        cn: orderResponseData.cn,
        courierName: orderResponseData.courierName,
        deliveryFee: orderResponseData?.deliveryFee,
        cod: Number(data.price) || 0,
      },
    });
    await updateOrderStatusAction(order.id, "READY_TO_SHIP");
    console.log("Shipping Data Created:", shippingdata);
    return { success: true, data: shippingdata || courierData };
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
        "Courier ID and Order ID are required to cancel delivery.",
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

export async function getCourierDeliveryStatusAction({
  courierId,
  courierName,
}) {
  console.log("Getting status for:", courierId, courierName);
  // Simulate API call to get courier delivery status
  try {
    if (!courierId || !courierName) {
      throw new Error("Courier ID and Courier Name are required.");
    }
    switch (courierName.toLowerCase()) {
      case "pathao":
        const response = await getPathaoOrderInfo(courierId);
        console.log("Pathao Status Response:", response);
        if (!response) {
          throw new Error("Failed to get Pathao order info");
        }
        return {
          success: true,
          data: {
            status: response.order_status,
            updatedAt: response.updated_at,
          },
        };
        break;
      case "steadfast":
        const statusResponse = await getSteadfastDeliveryStatus(
          "consignment_id",
          courierId,
        );
        if (statusResponse.success) {
          console.log("Steadfast Status Response:", statusResponse);
          return {
            success: true,
            data: {
              status: statusResponse?.status,
              updatedAt: statusResponse?.updatedAt,
            },
          };
        } else {
          throw new Error(statusResponse.error || "Failed to get status");
        }

        break;
      default:
        throw new Error("Unsupported courier name.");
    }
    // Simulate API call
    const status = "PENDING"; // This would be replaced with actual API call
    return { success: true, data: { status } };
  } catch (error) {
    console.error("Error getting courier delivery status:", error);
    return { success: false, message: error.message };
  }
}
