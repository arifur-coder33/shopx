"use server";

import { createPathaoOrder } from "../lib/pathao";

export async function createCourierDelivery({ formData }) {
  // Simulate API call to create a courier delivery
  try {
    let data = Object.fromEntries(formData.entries());
    console.log("Creating courier delivery with data:", data);
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
            CN: response.data?.consignment_id,
            status: response.data.status,
            deliveryFee: response.data.delivery_fee,
            merchantOrderId: response.data.merchant_order_id,
            tracking_url: `https://pathaoship.com/track/${response.data?.consignment_id}`,
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
    }
    console.log("Courier order created:", orderResponseData);
    return { success: true, data: orderResponseData || courierData };
  } catch (error) {
    console.error("Error creating courier delivery:", error);
    return { success: false, message: error.message };
  }
}
