"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateCode } from "../utils/generateCode";
import { actionError, refreshProcurement, requireProcurementPermission, toNumber } from "../utils/procurement";
import { orderItemStockLines } from "@/lib/bundleStock";

export async function createDelivery(formData) {
  try {
    const userId = await requireProcurementPermission("delivery", "create");
    const values = Object.fromEntries(formData.entries());
    const items = JSON.parse(values.items || "[]")
      .map((item) => ({ orderItemId: item.orderItemId, goodsReceiptItemId: item.goodsReceiptItemId, quantity: toNumber(item.quantity) }))
      .filter((item) => item.orderItemId && item.goodsReceiptItemId && item.quantity > 0);
    if (!values.orderId || !values.warehouseId || !items.length) return { success: false, message: "Order, warehouse and delivery items are required." };

    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: values.orderId },
        include: {
          shipping: true,
          deliveries: { where: { status: { not: "CANCELLED" } }, select: { id: true } },
          orderItems: true,
        },
      });
      if (!order) throw new Error("Order was not found.");
      if (!(["PROCESSING", "SHIPPED"].includes(order.status)) && !(order.bundleReservationWarehouseId && order.status === "READY_TO_SHIP")) {
        throw new Error("Only a processing order can be prepared for delivery.");
      }
      if (!order.shipping?.courierProviderId) {
        throw new Error("Create the courier order before preparing delivery.");
      }
      if (order.bundleReservationWarehouseId && order.bundleReservationWarehouseId !== values.warehouseId) {
        throw new Error("Pack this bundle order from its reserved warehouse.");
      }
      const usesReservedStock = Boolean(order.bundleReservationWarehouseId) || order.adminNote === `POS_WAREHOUSE:${values.warehouseId}:RESERVED`;
      if (order.deliveries.length) {
        throw new Error("A delivery document already exists for this order.");
      }
      if (order.bundleReservationWarehouseId) {
        const locked = await tx.order.updateMany({
          where: { id: order.id, status: order.status, bundleReservationWarehouseId: values.warehouseId, deliveries: { none: { status: { not: "CANCELLED" } } } },
          data: { status: order.status },
        });
        if (!locked.count || await tx.delivery.count({ where: { orderId: order.id, status: { not: "CANCELLED" } } })) {
          throw new Error("Order changed while preparing delivery.");
        }
      }
      const keyFor = (orderItemId, variationId) => `${orderItemId}:${variationId}`;
      const orderItems = new Map(order.orderItems.flatMap((item) =>
        orderItemStockLines(item).map((line) => [keyFor(item.id, line.variationId), line]),
      ));
      const allocated = new Map();
      const batchLimits = new Map();
      const batchAllocated = new Map();
      const deliveryNo = await generateCode(tx, { name: "DELIVERY", prefix: "DEL-", padding: 7 });
      const rows = [];

      for (const item of items) {
        const batch = await tx.goodsReceiptItem.findUnique({ where: { id: item.goodsReceiptItemId }, include: { goodsReceipt: true } });
        const key = keyFor(item.orderItemId, batch?.variationId);
        const orderItem = orderItems.get(key);
        if (!orderItem || !batch) throw new Error("The selected lot does not match the order item.");
        if (batch.goodsReceipt?.status !== "COMPLETED" || batch.goodsReceipt.warehouseId !== values.warehouseId) {
          throw new Error("The selected batch is unavailable in this warehouse.");
        }
        const batchTotal = (batchAllocated.get(batch.id) || 0) + item.quantity;
        if (batchTotal > batch.quantity - batch.deliveredQuantity) throw new Error(`Delivery quantity exceeds the available quantity in batch ${batch.batchNumber}.`);
        batchAllocated.set(batch.id, batchTotal);
        batchLimits.set(batch.id, batch.quantity);
        allocated.set(key, (allocated.get(key) || 0) + item.quantity);
        rows.push({ orderItemId: item.orderItemId, goodsReceiptItemId: batch.id, variationId: batch.variationId, quantity: item.quantity });
      }

      for (const [key, orderItem] of orderItems) {
        if (Math.abs((allocated.get(key) || 0) - orderItem.quantity) > 0.0001) {
          throw new Error(
            `Allocate the full quantity (${orderItem.quantity}) for ${orderItem.sku}.`,
          );
        }
      }

      const result = await tx.delivery.create({ data: { deliveryNo, orderId: order.id, warehouseId: values.warehouseId, status: "PACKED", note: values.note || null, createdBy: userId, updatedBy: userId, items: { create: rows } } });
      for (const row of [...rows].sort((a, b) => a.variationId.localeCompare(b.variationId) || a.goodsReceiptItemId.localeCompare(b.goodsReceiptItemId))) {
        const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: row.variationId } } });
        const stockField = usesReservedStock ? "reserved" : "available";
        if (!stock) throw new Error("Warehouse stock is missing.");
        const updated = await tx.stock.updateMany({
          where: { id: stock.id, quantity: { gte: row.quantity }, [stockField]: { gte: row.quantity } },
          data: {
            quantity: { decrement: row.quantity },
            [stockField]: { decrement: row.quantity },
            updatedBy: userId,
          },
        });
        if (!updated.count) throw new Error("Warehouse stock is insufficient for this delivery.");
        const { quantity: balanceAfter } = await tx.stock.findUniqueOrThrow({ where: { id: stock.id }, select: { quantity: true } });
        const batch = await tx.goodsReceiptItem.updateMany({
          where: { id: row.goodsReceiptItemId, deliveredQuantity: { lte: batchLimits.get(row.goodsReceiptItemId) - row.quantity }, goodsReceipt: { status: "COMPLETED" } },
          data: { deliveredQuantity: { increment: row.quantity } },
        });
        if (!batch.count) throw new Error("Batch availability changed. Refresh and retry.");
        await tx.inventoryTransaction.create({ data: { warehouseId: values.warehouseId, variationId: row.variationId, type: "OUT", quantity: -row.quantity, balanceAfter, unitCost: stock.averageUnitCost || 0, referenceType: "SALE", referenceId: result.id, remarks: `Delivery ${deliveryNo} for order ${order.orderNo}`, createdBy: userId } });
      }
      const deliveryStatus = order.status === "SHIPPED" ? "SHIPPED" : "READY_TO_SHIP";
      if (order.status !== deliveryStatus) await tx.order.update({ where: { id: order.id }, data: { status: deliveryStatus } });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: deliveryStatus,
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
