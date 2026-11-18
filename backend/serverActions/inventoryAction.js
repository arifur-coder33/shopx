"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission, toNumber } from "../utils/procurement";

export async function adjustStock(formData) {
  try {
    const userId = await requireProcurementPermission("inventory", "update");
    const values = Object.fromEntries(formData.entries());
    const quantity = toNumber(values.quantity);
    if (!values.warehouseId || !values.variationId || quantity === 0) return { success: false, message: "Warehouse, variation and non-zero quantity are required." };
    const hasEnteredCost = String(values.unitCost ?? "").trim() !== "";
    const enteredCost = toNumber(values.unitCost, -1);
    if (hasEnteredCost && enteredCost < 0) throw new Error("Unit cost cannot be negative.");
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: values.variationId } } });
      const balanceAfter = (current?.quantity || 0) + quantity;
      if (balanceAfter < 0) throw new Error("Adjustment would make stock negative.");
      if (balanceAfter < (current?.reserved || 0)) throw new Error("Stock is reserved. Cancel the dependent reservation or transaction first.");
      const previousUnitCost = current?.averageUnitCost || 0;
      const movementUnitCost = quantity > 0 && hasEnteredCost ? enteredCost : previousUnitCost;
      if (quantity > 0 && ((current?.quantity || 0) === 0 || previousUnitCost <= 0) && !hasEnteredCost) throw new Error("Opening stock needs a unit cost so inventory value and assembly costs can be calculated.");
      const averageUnitCost = balanceAfter <= 0 ? 0 : quantity > 0 ? (((current?.quantity || 0) * previousUnitCost) + quantity * movementUnitCost) / balanceAfter : previousUnitCost;
      await tx.stock.upsert({ where: { warehouseId_variationId: { warehouseId: values.warehouseId, variationId: values.variationId } }, create: { warehouseId: values.warehouseId, variationId: values.variationId, quantity, available: quantity, averageUnitCost: movementUnitCost, createdBy: userId, updatedBy: userId }, update: { quantity: balanceAfter, available: balanceAfter - (current?.reserved || 0), averageUnitCost, updatedBy: userId } });
      return tx.inventoryTransaction.create({ data: { warehouseId: values.warehouseId, variationId: values.variationId, type: "ADJUSTMENT", quantity, balanceAfter, unitCost: movementUnitCost, referenceType: "ADJUSTMENT", remarks: values.remarks || "Manual stock adjustment", createdBy: userId } });
    });
    refreshProcurement();
    return { success: true, message: "Stock adjusted successfully.", data: result };
  } catch (error) { return actionError(error, "Failed to adjust stock."); }
}
