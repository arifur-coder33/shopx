"use server";
import prisma from "@/lib/prisma";
import { generateCode } from "../utils/generateCode";
import { ACCOUNT_CODES, postJournal } from "../utils/accounting";
import { actionError, refreshProcurement, requireProcurementPermission } from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";
import { inventoryOperationFingerprint, inventoryOperationId } from "../utils/inventoryOperation";

export async function createGoodsReceipt(formData) {
  try {
    const userId = await requireProcurementPermission("goodsReceipt", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const inputItems = JSON.parse(values.items || "[]");
    if (!Array.isArray(inputItems)) throw new Error("Receipt items must be a list.");
    const parsedItems = inputItems.map((item) => ({ purchaseItemId: item?.purchaseItemId, variationId: item?.variationId, quantity: Number(item?.quantity), supplierLotNumber: String(item?.supplierLotNumber || "").trim() }));
    if (parsedItems.some((item) => !item.purchaseItemId || !item.variationId || !Number.isSafeInteger(item.quantity) || item.quantity < 0)) throw new Error("Receipt quantities must be non-negative whole numbers.");
    const requestedItems = parsedItems.filter((item) => item.quantity > 0).sort((a, b) => a.purchaseItemId.localeCompare(b.purchaseItemId));
    if (new Set(requestedItems.map((item) => item.purchaseItemId)).size !== requestedItems.length) throw new Error("A purchase item may appear only once in a receipt.");
    if (!values.purchaseOrderId || !values.warehouseId || !requestedItems.length) return { success: false, message: "Purchase order, warehouse and receipt quantities are required." };
    if (requestedItems.some((item) => !item.supplierLotNumber)) return { success: false, message: "Supplier lot number is required for every received item." };
    const ledgerId = inventoryOperationId(storeId, "GOODS_RECEIPT", values.operationId);
    const fingerprint = inventoryOperationFingerprint([values.purchaseOrderId, values.warehouseId, requestedItems]);

    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.inventoryTransaction.findUnique({ where: { id: ledgerId } });
      if (previous) {
        if (previous.storeId !== storeId || previous.referenceType !== "PURCHASE" || !previous.remarks?.endsWith(`[retry:${fingerprint}]`)) throw new Error("Operation ID was already used for another goods receipt.");
        const existingReceipt = await tx.goodsReceipt.findUnique({ where: { id: previous.referenceId, storeId } });
        if (!existingReceipt) throw new Error("This goods receipt was removed and cannot be posted again with the same operation ID.");
        return existingReceipt;
      }
      const [po, warehouse] = await Promise.all([
        tx.purchaseOrder.findUnique({ where: { id: values.purchaseOrderId, storeId }, include: { items: true } }),
        tx.warehouse.findUnique({ where: { id: values.warehouseId, storeId }, select: { id: true } }),
      ]);
      if (!po || po.status === "CANCELLED") throw new Error("Purchase order is unavailable for receiving.");
      if (!warehouse) throw new Error("Warehouse was not found for this Store.");
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
      const receipt = await tx.goodsReceipt.create({ data: { storeId, grnNo, purchaseOrderId: po.id, warehouseId: values.warehouseId, status: "COMPLETED", createdBy: userId, updatedBy: userId, items: { create: receiptItems } } });

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

      for (const [index, item] of requestedItems.entries()) {
        const stockKey = { storeId, warehouseId: values.warehouseId, variationId: item.variationId };
        const current = await tx.stock.findUnique({ where: { storeId_warehouseId_variationId: stockKey } });
        let updatedStock;
        if (current) {
          if (!Number.isSafeInteger(current.quantity) || !Number.isSafeInteger(current.available)) throw new Error("Existing stock must be a safe whole-number quantity.");
          const limit = Number.MAX_SAFE_INTEGER - item.quantity;
          const increased = await tx.stock.updateMany({ where: { id: current.id, storeId, quantity: { gte: 0, lte: limit }, available: { gte: 0, lte: limit } }, data: { quantity: { increment: item.quantity }, available: { increment: item.quantity }, updatedBy: userId } });
          if (increased.count !== 1) throw new Error("Stock changed or exceeds a safe whole-number quantity.");
          updatedStock = await tx.stock.findUnique({ where: { id: current.id, storeId } });
        } else {
          updatedStock = await tx.stock.create({ data: { ...stockKey, quantity: item.quantity, available: item.quantity, createdBy: userId, updatedBy: userId } });
        }
        await tx.inventoryTransaction.create({ data: { ...(index === 0 ? { id: ledgerId } : {}), storeId, warehouseId: values.warehouseId, variationId: item.variationId, type: "IN", quantity: item.quantity, balanceAfter: updatedStock.quantity, referenceType: "PURCHASE", referenceId: receipt.id, remarks: `Received against ${po.poNo}; supplier lot ${item.supplierLotNumber}${index === 0 ? ` [retry:${fingerprint}]` : ""}`, createdBy: userId } });
        const received = await tx.purchaseItem.updateMany({ where: { id: item.purchaseItemId, purchaseOrderId: po.id, receivedQty: { lte: itemMap.get(item.purchaseItemId).quantity - item.quantity } }, data: { receivedQty: { increment: item.quantity } } });
        if (received.count !== 1) throw new Error("Received quantity changed or exceeds the purchase order.");
      }
      const updatedItems = await tx.purchaseItem.findMany({ where: { purchaseOrderId: po.id } });
      await tx.purchaseOrder.update({ where: { id: po.id, storeId }, data: { status: updatedItems.every((item) => item.receivedQty >= item.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED", updatedBy: userId } });
      return receipt;
    });
    refreshProcurement();
    return { success: true, message: `Goods receipt ${result.grnNo} posted and batches generated.`, data: result };
  } catch (error) { return actionError(error, "Failed to post goods receipt."); }
}
