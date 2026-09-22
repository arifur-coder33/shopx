"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission } from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";
import { inventoryOperationFingerprint, inventoryOperationId } from "../utils/inventoryOperation";

export async function adjustStock(formData) {
  try {
    const userId = await requireProcurementPermission("inventory", "update");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const quantity = Number(values.quantity);
    if (!values.warehouseId || !values.variationId || !Number.isSafeInteger(quantity) || quantity === 0) return { success: false, message: "Warehouse, variation and a non-zero whole-number quantity are required." };
    const ledgerId = inventoryOperationId(storeId, "ADJUSTMENT", values.operationId);
    const remarks = String(values.remarks || "Manual stock adjustment");
    const fingerprint = inventoryOperationFingerprint([values.warehouseId, values.variationId, quantity, remarks]);
    const result = await prisma.$transaction(async (tx) => {
      const previous = await tx.inventoryTransaction.findUnique({ where: { id: ledgerId } });
      if (previous) {
        if (previous.storeId !== storeId || previous.referenceType !== "ADJUSTMENT" || previous.referenceId !== fingerprint) throw new Error("Operation ID was already used for another stock adjustment.");
        return previous;
      }
      const [warehouse, variation] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: values.warehouseId, storeId }, select: { id: true } }),
        tx.productVariation.findFirst({ where: { id: values.variationId, product: { storeId } }, select: { id: true } }),
      ]);
      if (!warehouse || !variation) throw new Error("Warehouse or product variation belongs to another Store.");
      const stockKey = { storeId_warehouseId_variationId: { storeId, warehouseId: warehouse.id, variationId: variation.id } };
      const current = await tx.stock.findUnique({ where: stockKey });
      if (!current && quantity < 0) throw new Error("Adjustment would make stock negative.");
      if (current && (!Number.isSafeInteger(current.quantity + quantity) || !Number.isSafeInteger(current.available + quantity))) {
        throw new Error("Adjustment would make stock exceed a safe whole-number quantity.");
      }
      let updated;
      if (current) {
        const decrement = Math.max(0, -quantity);
        const bounds = quantity > 0
          ? { gte: 0, lte: Number.MAX_SAFE_INTEGER - quantity }
          : { gte: decrement };
        const changed = await tx.stock.updateMany({
          where: { id: current.id, storeId, quantity: bounds, available: bounds },
          data: { quantity: { increment: quantity }, available: { increment: quantity }, updatedBy: userId },
        });
        if (changed.count !== 1) throw new Error("Stock changed or is insufficient for this adjustment.");
        updated = await tx.stock.findUnique({ where: stockKey });
      } else {
        updated = await tx.stock.create({ data: { storeId, warehouseId: warehouse.id, variationId: variation.id, quantity, available: quantity, createdBy: userId, updatedBy: userId } });
      }
      return tx.inventoryTransaction.create({ data: { id: ledgerId, storeId, warehouseId: warehouse.id, variationId: variation.id, type: "ADJUSTMENT", quantity, balanceAfter: updated.quantity, referenceType: "ADJUSTMENT", referenceId: fingerprint, remarks, createdBy: userId } });
    });
    refreshProcurement();
    return { success: true, message: "Stock adjusted successfully.", data: result };
  } catch (error) { return actionError(error, "Failed to adjust stock."); }
}
