"use server";
import prisma from "@/lib/prisma";
import { generateCode } from "../utils/generateCode";
import { actionError, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";

export async function createPurchaseOrder(formData) {
  try {
    const userId = await requireProcurementPermission("purchase", "create");
    const values = Object.fromEntries(formData.entries());
    const items = JSON.parse(values.items || "[]").map((item) => ({ variationId: item.variationId, productId: item.productId, quantity: toNumber(item.quantity), unitCost: toNumber(item.unitCost), discount: toNumber(item.discount), total: toNumber(item.quantity) * toNumber(item.unitCost) - toNumber(item.discount) })).filter((item) => item.variationId && item.productId && item.quantity > 0 && item.unitCost >= 0);
    if (!values.supplierId || !items.length) return { success: false, message: "Supplier and at least one valid item are required." };
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const discount = toNumber(values.discount), vat = toNumber(values.vat), shippingCost = toNumber(values.shippingCost);
    const total = Math.max(0, subtotal - discount + vat + shippingCost);
    const result = await prisma.$transaction(async (tx) => {
      const poNo = await generateCode(tx, { name: "PURCHASE_ORDER", prefix: "PO-", padding: 6 });
      return tx.purchaseOrder.create({ data: { poNo, supplierId: values.supplierId, status: values.status || "DRAFT", subtotal, discount, vat, shippingCost, total, dueAmount: total, expectedDate: values.expectedDate ? toDate(values.expectedDate) : null, notes: values.notes || null, createdBy: userId, updatedBy: userId, items: { create: items } } });
    });
    refreshProcurement();
    return { success: true, message: `Purchase order ${result.poNo} created.`, data: result };
  } catch (error) { return actionError(error, "Failed to create purchase order."); }
}

export async function updatePurchaseStatus(id, status) {
  try {
    const userId = await requireProcurementPermission("purchase", "update");
    if (!["DRAFT", "APPROVED", "ORDERED", "CANCELLED"].includes(status)) return { success: false, message: "Invalid purchase status." };
    const current = await prisma.purchaseOrder.findUnique({ where: { id }, select: { status: true } });
    if (!current) return { success: false, message: "Purchase order not found." };
    if (["PARTIALLY_RECEIVED", "RECEIVED"].includes(current.status) && status === "CANCELLED") return { success: false, message: "A received purchase order cannot be cancelled." };
    await prisma.purchaseOrder.update({ where: { id }, data: { status, updatedBy: userId } });
    refreshProcurement();
    return { success: true, message: "Purchase status updated." };
  } catch (error) { return actionError(error, "Failed to update purchase status."); }
}
