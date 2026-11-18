"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getProviderRuntimeConfiguration } from "../services/providerCredentialService";
import {
  createSteadfastOrder,
  getSteadfastDeliveryStatus,
} from "../lib/courier/steadfast";
import { getOrFetchSteadfastHistory } from "@/backend/services/steadfastFraudService";
import { createPathaoOrder, getPathaoOrderInfo } from "../lib/pathao";
import { updateOrderStatusAction } from "./orderActions";
import { actionError, requireProcurementPermission } from "../utils/procurement";

export async function getAvailableCourierProvidersForOrder() {
  try {
    await requireProcurementPermission("order", "view");
    const providers = await prisma.courierProvider.findMany({
      where: { isActive: true, adapterKey: { not: "MANUAL" } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        adapterKey: true,
        isActive: true,
        moneyAccountId: true,
        encryptedCredentials: true,
        nonSecretConfig: true,
        moneyAccount: { select: { id: true, isActive: true } },
        pickupPoints: { select: { id: true, name: true, address: true, storeId: true } },
      },
    });
    const data = providers
      .filter(
        (provider) =>
          getProviderRuntimeConfiguration("courier", provider).ready,
      )
      .map(({ id, name, code, adapterKey, pickupPoints, nonSecretConfig }) => ({
        id,
        name,
        code,
        adapterKey,
        pickupPoints,
        deliveryFeeConfig: adapterKey === "MANUAL" ? nonSecretConfig || {} : null,
      }));
    const manualProvider = await prisma.courierProvider.findFirst({
      where: { OR: [{ adapterKey: "MANUAL", isActive: true }, { manualBookingEnabled: true }] },
      select: { id: true },
    });
    return { success: true, data, manualBookingAvailable: Boolean(manualProvider) };
  } catch (error) {
    return actionError(error, "Failed to load couriers.");
  }
}

export async function getCourierProvidersForManualEntryAction() {
  try {
    await requireProcurementPermission("order", "view");
    const providers = await prisma.courierProvider.findMany({
      where: { OR: [{ adapterKey: "MANUAL", isActive: true }, { manualBookingEnabled: true }] },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        code: true,
        adapterKey: true,
        nonSecretConfig: true,
        moneyAccount: { select: { id: true, isActive: true } },
      },
    });
    return {
      success: true,
      data: providers.filter((provider) => {
        const config = provider.nonSecretConfig || {};
        const validCharges = [config.insideDhakaCharge, config.outsideDhakaCharge].every((value) => value !== undefined && value !== null && String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
        const supportsCod = config.supportsCod === true || String(config.supportsCod) === "true";
        return validCharges && (!supportsCod || Boolean(provider.moneyAccount?.id && provider.moneyAccount.isActive));
      }).map(({ nonSecretConfig, moneyAccount, ...provider }) => ({
        ...provider,
        deliveryFeeConfig: nonSecretConfig || {},
      })),
    };
  } catch (error) {
    return actionError(error, "Failed to load courier list for manual entry.");
  }
}

export async function createCourierDeliveryAction({ formData }) {
  // Simulate API call to create a courier delivery
  try {
    let posOnlyPermission = false;
    try {
      await requireProcurementPermission("order", "update");
    } catch (permissionError) {
      await requireProcurementPermission("pos", "create");
      posOnlyPermission = true;
    }
    let data = Object.fromEntries(formData.entries());

    const order = await prisma.order.findUnique({
      where: { orderNo: data.invoice },
      select: { id: true, status: true, shipping: true, paymentMethod: true },
    });

    if (!order) {
      return {
        success: false,
        message: "No order found with the provided invoice number.",
      };
    }
    if (posOnlyPermission) {
      const posOrder = await prisma.order.findUnique({
        where: { id: order.id },
        select: { adminNote: true },
      });
      if (!posOrder?.adminNote?.startsWith("POS_WAREHOUSE:")) {
        throw new Error("You do not have permission to book a courier for this order.");
      }
    }
    if (order.shipping) {
      if (order.status !== "PENDING") throw new Error("A courier order has already been created for this order.");
      const confirmation = await updateOrderStatusAction(order.id, "PROCESSING");
      if (!confirmation.success) throw new Error(confirmation.message || "Order confirmation failed.");
      revalidatePath("/admin/inventory/deliveries");
      return { success: true, data: { ...order.shipping, orderStatus: "PROCESSING" } };
    }
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      throw new Error("Only a pending or processing order can be sent to a courier.");
    }
    const provider = await prisma.courierProvider.findUnique({
      where: { id: data.courierProviderId },
      include: { moneyAccount: true },
    });
    const manualEntry = data.manualEntry === "true";
    if (!provider || (!manualEntry && !provider.isActive)) {
      throw new Error("Selected courier is unavailable.");
    }
    if (manualEntry && !(provider.adapterKey === "MANUAL" ? provider.isActive : provider.manualBookingEnabled)) {
      throw new Error("Manual booking is disabled for this courier. Activate it in Courier Configuration.");
    }
    const providerConfiguration = getProviderRuntimeConfiguration(
      "courier",
      provider,
    );
    if (!manualEntry && !providerConfiguration.ready) {
      throw new Error("Selected courier is unavailable or not fully configured.");
    }
    if (manualEntry) {
      const config = providerConfiguration.config;
      const ratesReady = [config.insideDhakaCharge, config.outsideDhakaCharge].every((value) => value !== undefined && value !== null && String(value).trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0);
      if (!ratesReady) throw new Error("Configure the courier delivery charges before manual booking.");
      if (order.paymentMethod === "COD" && !providerConfiguration.supportsCod) throw new Error("This courier is not configured to collect COD.");
      if (providerConfiguration.supportsCod && !provider.moneyAccount?.isActive) throw new Error("Activate the courier's COD money account first.");
    }
    const courierName = provider.adapterKey;
    const pickupPoint = data.pickupPointId
      ? await prisma.courierPickupPoint.findFirst({
          where: {
            id: data.pickupPointId,
            courierProviderId: provider.id,
          },
          select: { id: true, name: true, address: true, storeId: true },
        })
      : null;
    if (!manualEntry && data.pickupPointId && !pickupPoint) {
      throw new Error("The selected pickup point does not belong to this courier.");
    }
    if (!manualEntry && courierName === "PATHAO" && !pickupPoint?.storeId) {
      throw new Error("Create and select a Pathao pickup point before booking.");
    }

    const pathaoStoreId = pickupPoint?.storeId ? Number(pickupPoint.storeId) : null;
    if (
      !manualEntry && courierName === "PATHAO" &&
      (!Number.isInteger(pathaoStoreId) || pathaoStoreId <= 0)
    ) {
      throw new Error("The selected Pathao pickup point has an invalid Store ID.");
    }

    let courierData = {};
    let orderResponseData = null;
    if (manualEntry) {
      const cn = String(data.cn || "").trim();
      if (!cn) throw new Error("Enter the consignment number from the courier.");
      let deliveryFee;
      const config = providerConfiguration.config;
      const location = `${data.city || ""} ${data.address || ""}`.toLowerCase();
      const insideDhaka = location.includes("dhaka") || location.includes("ঢাকা");
      const baseFee = Number(insideDhaka ? config.insideDhakaCharge : config.outsideDhakaCharge);
      const weight = Math.max(0, Number(data.weight) || 0);
      deliveryFee = baseFee + Math.max(0, Math.ceil(weight - 1)) * (Number(config.additionalKgCharge) || 0);
      orderResponseData = {
        cn,
        status: "MANUALLY_BOOKED",
        date: new Date().toLocaleDateString(),
        courierName: provider.name,
        storeName: pickupPoint?.name || "",
        deliveryFee,
        merchantOrderId: data.invoice,
        isManualEntry: true,
      };
    } else switch (courierName) {
      case "PATHAO":
        courierData = {
          store_id: pathaoStoreId,
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

        const response = await createPathaoOrder(
          courierData,
          providerConfiguration,
        );

        if (response.code === 200) {
          orderResponseData = {
            cn: response.data?.consignment_id,
            status: response.data.order_status,
            date: new Date().toLocaleDateString(),
            courierName: provider.name,
            storeName: pickupPoint.name,
            deliveryFee: response.data.delivery_fee,
            merchantOrderId: response.data.merchant_order_id,
            tracking_url: `https://pcom.page.link/${response.data?.consignment_id}`,
          };
        } else {
          throw new Error("❌ Failed to create Pathao order");
        }

        break;
      case "STEADFAST":
        courierData = {
          invoice: data.invoice,
          recipient_name: data.name,
          recipient_phone: data.phone,
          recipient_address: data.address,
          cod_amount: Number(data.price) || 0,
          note: "Call before delivery",
        };
        const steadfastResponse = await createSteadfastOrder(
          courierData,
          providerConfiguration,
        );
        if (steadfastResponse.success) {
          orderResponseData = {
            cn: steadfastResponse?.data?.consignment_id.toString(),
            trackingCode: steadfastResponse?.data?.tracking_code,
            trackingLink: steadfastResponse?.data?.tracking_link,
            status: steadfastResponse?.data?.status,
            date: steadfastResponse?.data?.created_at,
            courierName: provider.name,
            storeName: pickupPoint?.name || "",
            merchantOrderId: steadfastResponse?.data?.invoice || data.invoice,
          };
        } else {
          throw new Error(
            steadfastResponse.error || "Failed to create Steadfast order",
          );
        }

        break;
      case "MANUAL": {
        const config = providerConfiguration.config;
        const location = `${data.city || ""} ${data.address || ""}`.toLowerCase();
        const insideDhaka = location.includes("dhaka") || location.includes("ঢাকা");
        const baseFee = Number(insideDhaka ? config.insideDhakaCharge : config.outsideDhakaCharge) || 0;
        const weight = Math.max(0, Number(data.weight) || 0);
        const additionalKg = Math.max(0, Math.ceil(weight - 1));
        const deliveryFee = baseFee + additionalKg * (Number(config.additionalKgCharge) || 0);
        orderResponseData = {
          cn: data?.cn || "N/A",
          status: "READY_TO_SHIP",
          date: new Date().toLocaleDateString(),
          courierName: provider.name,
          storeName: pickupPoint?.name || "",
          deliveryFee,
          merchantOrderId: data.invoice || "N/A",
        };
        break;
      }
      default:
        orderResponseData = {
          cn: data?.cn || "N/A",
          status: "READY_TO_SHIP",
          date: new Date().toLocaleDateString(),
          courierName: provider.name,
          storeName: pickupPoint?.name || "",
          deliveryFee: data?.deliveryFee || 0,
          merchantOrderId: data.invoice || "N/A",
        };

        break;
    }
    const shippingdata = await prisma.shipping.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        orderNo: data.invoice,
        cn: orderResponseData.cn,
        courierName: orderResponseData.courierName,
        courierProviderId: provider.id,
        isManualEntry: Boolean(orderResponseData.isManualEntry),
        deliveryFee: orderResponseData?.deliveryFee,
        cod: Number(data.price) || 0,
      },
      update: {
        orderNo: data.invoice,
        cn: orderResponseData.cn,
        courierName: orderResponseData.courierName,
        courierProviderId: provider.id,
        isManualEntry: Boolean(orderResponseData.isManualEntry),
        deliveryFee: orderResponseData?.deliveryFee,
        cod: Number(data.price) || 0,
      },
    });
    if (provider.adapterKey === "STEADFAST" && orderResponseData.trackingCode) {
      const currentOrder = await prisma.order.findUnique({
        where: { id: order.id },
        select: { fraudRiskFactors: true },
      });
      const factors = Array.isArray(currentOrder?.fraudRiskFactors) ? currentOrder.fraudRiskFactors : [];
      await prisma.order.update({
        where: { id: order.id },
        data: {
          fraudRiskFactors: [
            ...factors.filter((factor) => factor?.code !== "STEADFAST_TRACKING"),
            {
              code: "STEADFAST_TRACKING",
              points: 0,
              trackingCode: orderResponseData.trackingCode,
              trackingLink: orderResponseData.trackingLink || null,
              status: orderResponseData.status || "in_review",
              invoice: orderResponseData.merchantOrderId,
            },
          ],
        },
      });
    }
    // Confirming the sale and creating its courier consignment is one action.
    // Packing/stock allocation happens later from the Delivery Queue.
    if (order.status !== "PROCESSING") {
      const confirmation = await updateOrderStatusAction(order.id, "PROCESSING");
      if (!confirmation.success) throw new Error(confirmation.message || "Courier booked, but confirmation failed.");
    }
    revalidatePath("/admin/inventory/deliveries");
    return {
      success: true,
      data: {
        ...shippingdata,
        orderStatus: "PROCESSING",
        isManualEntry: Boolean(orderResponseData.isManualEntry),
        status: orderResponseData.status || "in_review",
        ...(orderResponseData.trackingCode ? { trackingCode: orderResponseData.trackingCode } : {}),
        ...(orderResponseData.trackingLink ? { trackingLink: orderResponseData.trackingLink } : {}),
      },
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function cancelCourierDeliveryAction(courierId, orderId) {
  // Simulate API call to cancel a courier delivery
  try {
    await requireProcurementPermission("order", "update");
    if (!courierId || !orderId) {
      throw new Error(
        "Courier ID and Order ID are required to cancel delivery.",
      );
    }
    await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: { in: ["PENDING", "PROCESSING"] },
          shipping: { is: { id: courierId } },
          deliveries: { none: {} },
        },
        data: { status: "PENDING" },
      });
      if (!changed.count) throw new Error("Courier booking missing or delivery already started.");
      await tx.shipping.delete({ where: { id: courierId } });
    });
    revalidatePath("/admin/orders");
    revalidatePath("/admin/orders2");
    revalidatePath("/admin/inventory/deliveries");
    return { success: true, data: { status: "PENDING" } };
  } catch (error) {
    console.error("Error cancelling courier delivery:", error);
    return { success: false, message: error.message };
  }
}

export async function getCourierDeliveryStatusAction({
  courierId,
  courierProviderId,
}) {
  // Simulate API call to get courier delivery status
  try {
    await requireProcurementPermission("order", "view");
    if (!courierId || !courierProviderId) {
      throw new Error("Courier and consignment ID are required.");
    }
    const provider = await prisma.courierProvider.findUnique({ where: { id: courierProviderId } });
    if (!provider) throw new Error("Courier provider was not found.");
    const providerConfiguration = getProviderRuntimeConfiguration(
      "courier",
      provider,
    );
    if (
      !providerConfiguration.integrationAvailable ||
      !providerConfiguration.credentialsConfigured
    ) {
      throw new Error("Courier credentials are unavailable.");
    }
    const syncDeliveredStatus = async (rawStatus) => {
      const normalizedStatus = String(rawStatus || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
      if (normalizedStatus !== "delivered") return;
      const shipping = await prisma.shipping.findFirst({
        where: { cn: String(courierId), courierProviderId: provider.id },
        select: { orderId: true },
      });
      if (shipping) {
        const synced = await updateOrderStatusAction(
          shipping.orderId,
          "DELIVERED",
          `${provider.name} marked this shipment as delivered.`,
        );
        if (!synced.success) throw new Error(synced.message);
      }
    };

    switch (provider.adapterKey) {
      case "MANUAL":
        return {
          success: true,
          data: { status: "Manual delivery", updatedAt: null },
        };
      case "PATHAO":
        const response = await getPathaoOrderInfo(
          courierId,
          providerConfiguration,
        );
        if (!response) {
          throw new Error("Failed to get Pathao order info");
        }
        await syncDeliveredStatus(response.order_status);
        return {
          success: true,
          data: {
            status: response.order_status,
            updatedAt: response.updated_at,
          },
        };
        break;
      case "STEADFAST":
        const statusResponse = await getSteadfastDeliveryStatus(
          "consignment_id",
          courierId,
          providerConfiguration,
        );
        if (statusResponse.success) {
          await syncDeliveredStatus(statusResponse.status);
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
    return { success: false, message: error.message };
  }
}

export async function getSteadfastFraudCheckAction(orderId) {
  try {
    await requireProcurementPermission("order", "view");
    if (!orderId) throw new Error("অর্ডার পাওয়া যায়নি।");
    return await getOrFetchSteadfastHistory(orderId);
  } catch (error) {
    return { success: false, error: error.message || "Steadfast fraud check করা যায়নি।" };
  }
}
