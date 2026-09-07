"use server";
import prisma from "@/lib/prisma";
import { generateCode } from "../utils/generateCode";
import { ACCOUNT_CODES, postJournal } from "../utils/accounting";
import { actionError, refreshProcurement, requireProcurementPermission, toNumber } from "../utils/procurement";

export async function createGoodsReceipt(formData) {
  try {
    const userId = await requireProcurementPermission("goodsReceipt", "create");
    const values = Object.fromEntries(formData.entries());
    const requestedItems = JSON.parse(values.items || "[]").map((item) => ({ purchaseItemId: item.purchaseItemId, variationId: item.variationId, quantity: toNumber(item.quantity), supplierLotNumber: String(item.supplierLotNumber || "").trim() })).filter((item) => item.purchaseItemId && item.variationId && item.quantity > 0);
    if (!values.purchaseOrderId || !values.warehouseId || !requestedItems.length) return { success: false, message: "Purchase order, warehouse and receipt quantities are required." };
    if (requestedItems.some((item) => !item.supplierLotNumber)) return { success: false, message: "Supplier lot number is required for every received item." };

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id: values.purchaseOrderId }, include: { items: true } });
      if (!po || po.status === "CANCELLED") throw new Error("Purchase order is unavailable for receiving.");
      const itemMap = new Map(po.items.map((item) => [item.id, item]));
      for (const item of requestedItems) {
        const source = itemMap.get(item.purchaseItemId);
        if (!source || source.variationId !== item.variationId) throw new Error("Receipt item does not belong to this purchase order.");
        if (item.quantity > source.quantity - source.receivedQty) throw new Error("Received quantity exceeds the remaining purchase quantity.");
      }

      const grnNo = await generateCode(tx, { name: "GOODS_RECEIPT", prefix: "GRN-", padding: 6 });
      const receiptItems = [];
      for (const item of requestedItems) {
        const batchNumber = await generateCode(tx, { name: "INVENTORY_BATCH", prefix: "BAT-", padding: 8 });
        receiptItems.push({ variationId: item.variationId, quantity: item.quantity, batchNumber, supplierLotNumber: item.supplierLotNumber });
      }
      const receipt = await tx.goodsReceipt.create({ data: { grnNo, purchaseOrderId: po.id, warehouseId: values.warehouseId, status: "COMPLETED", createdBy: userId, updatedBy: userId, items: { create: receiptItems } } });

      const receiptValue = requestedItems.reduce((sum, item) => {
        const source = itemMap.get(item.purchaseItemId);
        const discountPerUnit = source.quantity ? source.discount / source.quantity : 0;
        return sum + item.quantity * Math.max(0, source.unitCost - discountPerUnit);
      }, 0);
      if (receiptValue > 0) await postJournal(tx, {
        description: `Goods received against ${po.poNo}`,
        referenceType: "GOODS_RECEIPT",
        referenceId: receipt.id,
        createdBy: userId,
        lines: [
          { accountCode: ACCOUNT_CODES.INVENTORY, debit: receiptValue },
          { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: receiptValue },
        ],
      });

      for (const item of requestedItems) {
        const current = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: item.variationId } } });
        const balanceAfter = (current?.quantity || 0) + item.quantity;
        await tx.stock.upsert({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: item.variationId } }, create: { warehouseId: values.warehouseId, variationId: item.variationId, quantity: item.quantity, available: item.quantity, createdBy: userId, updatedBy: userId }, update: { quantity: { increment: item.quantity }, available: { increment: item.quantity }, updatedBy: userId } });
        await tx.inventoryTransaction.create({ data: { warehouseId: values.warehouseId, variationId: item.variationId, type: "IN", quantity: item.quantity, balanceAfter, referenceType: "PURCHASE", referenceId: receipt.id, remarks: `Received against ${po.poNo}; supplier lot ${item.supplierLotNumber}`, createdBy: userId } });
        await tx.purchaseItem.update({ where: { id: item.purchaseItemId }, data: { receivedQty: { increment: item.quantity } } });
      }
      const updatedItems = await tx.purchaseItem.findMany({ where: { purchaseOrderId: po.id } });
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: updatedItems.every((item) => item.receivedQty >= item.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED", updatedBy: userId } });
      return receipt;
    });
    refreshProcurement();
    return { success: true, message: `Goods receipt ${result.grnNo} posted and batches generated.`, data: result };
  } catch (error) { return actionError(error, "Failed to post goods receipt."); }
}
