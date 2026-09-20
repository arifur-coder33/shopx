"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateCode } from "../utils/generateCode";
import { actionError, refreshProcurement, requireProcurementPermission } from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";

export async function createDelivery(formData) {
  try {
    const userId = await requireProcurementPermission("delivery", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const inputItems = JSON.parse(values.items || "[]");
    if (!Array.isArray(inputItems)) throw new Error("Delivery items must be a list.");
    const items = inputItems.map((item) => ({ orderItemId: item?.orderItemId, goodsReceiptItemId: item?.goodsReceiptItemId, quantity: Number(item?.quantity) }));
    if (items.some((item) => !item.orderItemId || !item.goodsReceiptItemId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0)) throw new Error("Delivery quantities must be positive whole numbers.");
    if (!values.orderId || !values.warehouseId || !items.length) return { success: false, message: "Order, warehouse and delivery items are required." };

    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: values.orderId, storeId },
        include: {
          shipping: true,
          deliveries: { select: { id: true } },
          orderItems: { include: { deliveryItems: true } },
        },
      });
      if (!order) throw new Error("Order was not found.");
      const warehouse = await tx.warehouse.findUnique({ where: { id: values.warehouseId, storeId }, select: { id: true } });
      if (!warehouse) throw new Error("Warehouse was not found for this Store.");
      if (order.status !== "PROCESSING") {
        throw new Error("Only a processing order can be prepared for delivery.");
      }
      if (!order.shipping?.courierProviderId) {
        throw new Error("Create the courier order before preparing delivery.");
      }
      if (order.deliveries.length) {
        throw new Error("A delivery document already exists for this order.");
      }
      const orderItems = new Map(order.orderItems.map((item) => [item.id, item]));
      const deliveryNo = await generateCode(tx, { name: "DELIVERY", prefix: "DEL-", padding: 7 });
      const rows = [];

      for (const item of items) {
        const orderItem = orderItems.get(item.orderItemId);
        const batch = await tx.goodsReceiptItem.findFirst({ where: { id: item.goodsReceiptItemId, goodsReceipt: { is: { storeId } } }, include: { goodsReceipt: true } });
        if (!orderItem || !batch || orderItem.variationId !== batch.variationId) throw new Error("The selected lot does not match the order item.");
        if (!batch.goodsReceipt || batch.goodsReceipt.warehouseId !== values.warehouseId) throw new Error("The selected batch is orphaned or does not belong to the selected warehouse.");
        const alreadyDelivered = orderItem.deliveryItems.reduce((sum, row) => sum + row.quantity, 0);
        if (item.quantity > orderItem.quantity - alreadyDelivered) throw new Error(`Delivery quantity exceeds ordered quantity for ${orderItem.sku}.`);
        if (item.quantity > batch.quantity - batch.deliveredQuantity) throw new Error(`Delivery quantity exceeds the available quantity in batch ${batch.batchNumber}.`);
        rows.push({ orderItemId: item.orderItemId, goodsReceiptItemId: batch.id, variationId: batch.variationId, quantity: item.quantity });
      }

      for (const orderItem of order.orderItems) {
        const alreadyDelivered = orderItem.deliveryItems.reduce(
          (sum, row) => sum + row.quantity,
          0,
        );
        const allocatedNow = rows
          .filter((row) => row.orderItemId === orderItem.id)
          .reduce((sum, row) => sum + row.quantity, 0);
        const remaining = orderItem.quantity - alreadyDelivered;
        if (Math.abs(allocatedNow - remaining) > 0.0001) {
          throw new Error(
            `Allocate the full remaining quantity (${remaining}) for ${orderItem.sku}.`,
          );
        }
      }

      const result = await tx.delivery.create({ data: { storeId, deliveryNo, orderId: order.id, warehouseId: values.warehouseId, status: values.status || "PACKED", note: values.note || null, createdBy: userId, updatedBy: userId, items: { create: rows } } });
      const checkoutDebits = await tx.inventoryTransaction.findMany({
        where: { storeId, referenceType: "SALE", referenceId: order.id, type: "OUT", createdBy: "checkout" },
        select: { variationId: true, warehouseId: true, quantity: true },
      });
      const consumedByVariation = new Map();
      for (const debit of checkoutDebits) {
        if (debit.warehouseId !== values.warehouseId) {
          throw new Error("Delivery warehouse must match the checkout stock allocation.");
        }
        consumedByVariation.set(
          debit.variationId,
          (consumedByVariation.get(debit.variationId) || 0) - debit.quantity,
        );
      }
      for (const [variationId, consumed] of consumedByVariation) {
        const allocated = rows.filter((row) => row.variationId === variationId)
          .reduce((sum, row) => sum + row.quantity, 0);
        if (Math.abs(consumed - allocated) > 0.0001) {
          throw new Error("Delivery quantity must match the checkout stock allocation.");
        }
      }
      for (const row of rows) {
        if (!consumedByVariation.has(row.variationId)) {
          // Older orders and intentionally out-of-stock-orderable products
          // still consume stock on delivery, as before this checkout change.
          const stock = await tx.stock.findUnique({ where: { storeId_warehouseId_variationId: { storeId, warehouseId: values.warehouseId, variationId: row.variationId } } });
          if (!stock || stock.available < row.quantity) throw new Error("Warehouse stock is insufficient for this delivery.");
          const debited = await tx.stock.updateMany({ where: { id: stock.id, storeId, quantity: { gte: row.quantity }, available: { gte: row.quantity } }, data: { quantity: { decrement: row.quantity }, available: { decrement: row.quantity }, updatedBy: userId } });
          if (debited.count !== 1) throw new Error("Warehouse stock changed before this delivery could be prepared.");
          const updatedStock = await tx.stock.findUnique({ where: { id: stock.id, storeId }, select: { quantity: true } });
          await tx.inventoryTransaction.create({ data: { storeId, warehouseId: values.warehouseId, variationId: row.variationId, type: "OUT", quantity: -row.quantity, balanceAfter: updatedStock.quantity, referenceType: "SALE", referenceId: result.id, remarks: `Delivery ${deliveryNo} for order ${order.orderNo}`, createdBy: userId } });
        }
        const lot = await tx.goodsReceiptItem.findUnique({ where: { id: row.goodsReceiptItemId }, select: { quantity: true } });
        if (!lot) throw new Error("Supplier batch is unavailable.");
        const allocated = await tx.goodsReceiptItem.updateMany({ where: { id: row.goodsReceiptItemId, deliveredQuantity: { lte: lot.quantity - row.quantity } }, data: { deliveredQuantity: { increment: row.quantity } } });
        if (allocated.count !== 1) throw new Error("Supplier batch changed or has insufficient remaining quantity.");
      }
      await tx.order.update({ where: { id: order.id, storeId }, data: { status: "READY_TO_SHIP" } });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: "READY_TO_SHIP",
          title: "Ready for Delivery",
          message: `Delivery ${deliveryNo} packed and allocated from stock.`,
          createdBy: userId,
        },
      });
      return result;
    });
    refreshProcurement();
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/order/view/${values.orderId}`);
    return { success: true, message: `Delivery ${delivery.deliveryNo} created.`, data: delivery };
  } catch (error) {
    return actionError(error, "Failed to create delivery.");
  }
}
