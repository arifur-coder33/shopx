"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { generateCode } from "../utils/generateCode";
import { actionError, refreshProcurement, requireProcurementPermission, toNumber } from "../utils/procurement";

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
          deliveries: { select: { id: true } },
          orderItems: { include: { deliveryItems: true } },
        },
      });
      if (!order) throw new Error("Order was not found.");
      if (order.status !== "PROCESSING") {
        throw new Error("Only a processing order can be prepared for delivery.");
      }
      if (!order.shipping?.courierProviderId) {
        throw new Error("Create the courier order before preparing delivery.");
      }
      const isPosReservedOrder = order.adminNote === `POS_WAREHOUSE:${values.warehouseId}:RESERVED`;
      if (order.deliveries.length) {
        throw new Error("A delivery document already exists for this order.");
      }
      const orderItems = new Map(order.orderItems.map((item) => [item.id, item]));
      const deliveryNo = await generateCode(tx, { name: "DELIVERY", prefix: "DEL-", padding: 7 });
      const rows = [];

      for (const item of items) {
        const orderItem = orderItems.get(item.orderItemId);
        const batch = await tx.goodsReceiptItem.findUnique({ where: { id: item.goodsReceiptItemId }, include: { goodsReceipt: true } });
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

      const result = await tx.delivery.create({ data: { deliveryNo, orderId: order.id, warehouseId: values.warehouseId, status: values.status || "PACKED", note: values.note || null, createdBy: userId, updatedBy: userId, items: { create: rows } } });
      for (const row of rows) {
        const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: row.variationId } } });
        if (!stock || (isPosReservedOrder ? stock.reserved < row.quantity : stock.available < row.quantity)) {
          throw new Error(isPosReservedOrder ? "Reserved warehouse stock is insufficient for this delivery." : "Warehouse stock is insufficient for this delivery.");
        }
        const balanceAfter = stock.quantity - row.quantity;
        await tx.stock.update({
          where: { id: stock.id },
          data: {
            quantity: { decrement: row.quantity },
            ...(isPosReservedOrder
              ? { reserved: { decrement: row.quantity } }
              : { available: { decrement: row.quantity } }),
            updatedBy: userId,
          },
        });
        await tx.goodsReceiptItem.update({ where: { id: row.goodsReceiptItemId }, data: { deliveredQuantity: { increment: row.quantity } } });
        await tx.inventoryTransaction.create({ data: { warehouseId: values.warehouseId, variationId: row.variationId, type: "OUT", quantity: -row.quantity, balanceAfter, unitCost: stock.averageUnitCost || 0, referenceType: "SALE", referenceId: result.id, remarks: `Delivery ${deliveryNo} for order ${order.orderNo}`, createdBy: userId } });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "READY_TO_SHIP" } });
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
