"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission } from "@/backend/utils/procurement";
import { generateCode } from "@/backend/utils/generateCode";
import { assertAccountingPeriodOpen } from "@/backend/utils/accounting";
import { revalidatePath } from "next/cache";
import { getPurchaseReceiveSummary } from "../utils/purchaseReceiptValue";
import { releaseBundleOrder } from "@/backend/services/bundleReservationService";

async function move(tx, { warehouseId, variationId, quantity, unitCost, referenceType, referenceId, remarks, userId, type }) {
  const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId, variationId } } });
  const balanceAfter = (stock?.quantity || 0) + quantity;
  if (balanceAfter < (stock?.reserved || 0)) throw new Error("Reserved stock prevents cancellation; cancel its dependent reservation first.");
  const cost = unitCost ?? stock?.averageUnitCost ?? 0;
  const averageUnitCost = balanceAfter > 0 ? Math.max(0, ((stock?.quantity || 0) * (stock?.averageUnitCost || 0) + quantity * cost) / balanceAfter) : 0;
  await tx.stock.upsert({ where: { warehouseId_variationId: { warehouseId, variationId } }, create: { warehouseId, variationId, quantity: balanceAfter, available: balanceAfter, averageUnitCost: cost, createdBy: userId, updatedBy: userId }, update: { quantity: balanceAfter, available: balanceAfter - (stock?.reserved || 0), averageUnitCost, updatedBy: userId } });
  return tx.inventoryTransaction.create({ data: { warehouseId, variationId, type, quantity, balanceAfter, unitCost: cost, referenceType, referenceId, remarks, createdBy: userId } });
}
async function assertNoLater(tx, movements) {
  const ids = movements.map((m) => m.id);
  for (const m of movements) {
    const later = await tx.inventoryTransaction.findFirst({ where: { warehouseId: m.warehouseId, variationId: m.variationId, createdAt: { gt: m.createdAt }, id: { notIn: ids } }, orderBy: { createdAt: "asc" } });
    if (later) throw new Error(`পরের stock movement (${later.id}) আগে cancel করুন, তারপর এই document cancel হবে।`);
  }
}
export async function cancelGoodsReceipt(id) {
  try {
    const userId = await requireProcurementPermission("goodsReceipt", "update");
    await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.findUnique({ where: { id }, include: { items: true, purchaseOrder: { include: { items: true, expenses: { where: { voidedAt: null }, select: { amount: true, voidedAt: true } } } } } });
      if (!receipt || receipt.status === "CANCELLED") throw new Error("Receipt not found or already cancelled.");
      const paid = await tx.supplierPayment.count({ where: { purchaseOrderId: receipt.purchaseOrderId } });
      const delivered = await tx.deliveryItem.count({ where: { goodsReceiptItem: { goodsReceiptId: id } } });
      if (paid || delivered || receipt.items.some((item) => item.deliveredQuantity > 0)) throw new Error("Cancel the linked payment or delivery first; then retry receipt cancellation.");
      const movements = await tx.inventoryTransaction.findMany({ where: { referenceType: "PURCHASE", referenceId: id } });
      await assertNoLater(tx, movements);
      for (const movement of movements) await move(tx, { warehouseId: movement.warehouseId, variationId: movement.variationId, quantity: -movement.quantity, unitCost: movement.unitCost, referenceType: "PURCHASE", referenceId: id, remarks: `Cancellation reversal of ${movement.id}`, userId, type: "OUT" });
      for (const item of receipt.items) {
        const purchaseItem = receipt.purchaseOrder.items.find((row) => row.variationId === item.variationId && row.receivedQty >= item.quantity);
        if (!purchaseItem) throw new Error("Could not safely match receipt to purchase item.");
        await tx.purchaseItem.update({ where: { id: purchaseItem.id }, data: { receivedQty: { decrement: item.quantity } } });
      }
      const journals = await tx.journalEntry.findMany({ where: { referenceType: "GOODS_RECEIPT", referenceId: id, status: "POSTED" }, include: { lines: true } });
      for (const entry of journals) {
        await assertAccountingPeriodOpen(tx, new Date());
        const entryNo = await generateCode(tx, { name: "JOURNAL_ENTRY", prefix: "JV-", padding: 8 });
        await tx.journalEntry.create({ data: { entryNo, entryDate: new Date(), description: `Reversal: ${entry.description}`, referenceType: "GOODS_RECEIPT", referenceId: `cancel-${id}`, createdBy: userId, updatedBy: userId, lines: { create: entry.lines.map((line) => ({ accountId: line.accountId, debit: line.credit, credit: line.debit, memo: `Reversal: ${line.memo || entry.entryNo}` })) } } });
      }
      await tx.goodsReceipt.update({ where: { id }, data: { status: "CANCELLED", updatedBy: userId } });
      const remaining = await tx.purchaseItem.findMany({ where: { purchaseOrderId: receipt.purchaseOrderId } });
      const dueAmount = Math.max(0, getPurchaseReceiveSummary({ ...receipt.purchaseOrder, items: remaining }).receivedValue - Number(receipt.purchaseOrder.paidAmount || 0));
      await tx.purchaseOrder.update({ where: { id: receipt.purchaseOrderId }, data: { status: remaining.every((item) => item.receivedQty <= 0) ? "ORDERED" : remaining.every((item) => item.receivedQty >= item.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED", dueAmount, updatedBy: userId } });
    });
    refreshProcurement(); return { success: true, message: "Goods receipt cancelled and stock reversed." };
  } catch (error) { return actionError(error, "Could not cancel goods receipt."); }
}
export async function cancelPreparedDelivery(id) {
  try {
    const userId = await requireProcurementPermission("delivery", "update");
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id }, include: { items: true, order: true } });
      if (!delivery || delivery.status !== "PACKED") throw new Error("Only a packed delivery can be cancelled; shipped/delivered orders must be reversed through returns.");
      if (delivery.order.bundleReservationWarehouseId && !["PENDING", "PROCESSING", "READY_TO_SHIP", "CANCELLED"].includes(delivery.order.status)) {
        throw new Error("This bundle has already left the warehouse. Use return receiving.");
      }
      const movements = await tx.inventoryTransaction.findMany({ where: { referenceType: "SALE", referenceId: id } });
      await assertNoLater(tx, movements);
      const posReserved = delivery.order.bundleReservationWarehouseId === delivery.warehouseId || delivery.order.adminNote === `POS_WAREHOUSE:${delivery.warehouseId}:RESERVED`;
      for (const movement of movements) {
        const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: movement.warehouseId, variationId: movement.variationId } } });
        if (posReserved) await tx.stock.update({ where: { id: stock.id }, data: { quantity: { increment: -movement.quantity }, reserved: { increment: -movement.quantity }, updatedBy: userId } });
        else await tx.stock.update({ where: { id: stock.id }, data: { quantity: { increment: -movement.quantity }, available: { increment: -movement.quantity }, updatedBy: userId } });
        await tx.inventoryTransaction.create({ data: { warehouseId: movement.warehouseId, variationId: movement.variationId, type: "RETURN_IN", quantity: -movement.quantity, balanceAfter: stock.quantity - movement.quantity, unitCost: movement.unitCost ?? stock.averageUnitCost, referenceType: "SALE", referenceId: id, remarks: `Cancellation reversal of ${movement.id}`, createdBy: userId } });
      }
      for (const item of delivery.items) await tx.goodsReceiptItem.update({ where: { id: item.goodsReceiptItemId }, data: { deliveredQuantity: { decrement: item.quantity } } });
      await tx.delivery.update({ where: { id }, data: { status: "CANCELLED", updatedBy: userId } });
      const status = delivery.order.bundleReservationWarehouseId && delivery.order.status === "CANCELLED" ? "CANCELLED" : "PROCESSING";
      if (status === "CANCELLED") await releaseBundleOrder(tx, delivery.orderId);
      await tx.order.update({ where: { id: delivery.orderId }, data: { status } });
      await tx.orderTimeline.create({ data: { orderId: delivery.orderId, orderNo: delivery.order.orderNo, status, title: "Delivery cancelled", message: `Packed delivery ${delivery.deliveryNo} was cancelled and stock restored.`, createdBy: userId } });
    });
    refreshProcurement(); revalidatePath("/admin/orders"); return { success: true, message: "Packed delivery cancelled and stock restored." };
  } catch (error) { return actionError(error, "Could not cancel delivery."); }
}
