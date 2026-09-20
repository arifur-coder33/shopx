"use server";
import prisma from "@/lib/prisma";
import { generateCode } from "../utils/generateCode";
import { actionError, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";

export async function createPurchaseOrder(formData) {
  try {
    const userId = await requireProcurementPermission("purchase", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const inputItems = JSON.parse(values.items || "[]");
    if (!Array.isArray(inputItems)) throw new Error("Purchase items must be a list.");
    const items = inputItems.map((item) => ({ variationId: item?.variationId, productId: item?.productId, quantity: Number(item?.quantity), unitCost: toNumber(item?.unitCost), discount: toNumber(item?.discount), total: Number(item?.quantity) * toNumber(item?.unitCost) - toNumber(item?.discount) }));
    if (items.some((item) => !item.variationId || !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.unitCost < 0)) throw new Error("Purchase item quantities must be positive whole numbers.");
    if (!values.supplierId || !items.length) return { success: false, message: "Supplier and at least one valid item are required." };
    const [supplier, variations] = await Promise.all([
      prisma.supplier.findUnique({ where: { id: values.supplierId, storeId }, select: { id: true } }),
      prisma.productVariation.findMany({
        where: { id: { in: items.map((item) => item.variationId) }, product: { storeId } },
        select: { id: true, productId: true },
      }),
    ]);
    if (!supplier) throw new Error("Supplier was not found for this Store.");
    const variationMap = new Map(variations.map((variation) => [variation.id, variation]));
    if (items.some((item) => variationMap.get(item.variationId)?.productId !== item.productId)) {
      throw new Error("A purchase item product/variation belongs to another Store.");
    }
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    const discount = toNumber(values.discount), vat = toNumber(values.vat), shippingCost = toNumber(values.shippingCost);
    const total = Math.max(0, subtotal - discount + vat + shippingCost);
    const result = await prisma.$transaction(async (tx) => {
      const poNo = await generateCode(tx, { name: "PURCHASE_ORDER", prefix: "PO-", padding: 6 });
      return tx.purchaseOrder.create({ data: { storeId, poNo, supplierId: values.supplierId, status: values.status || "DRAFT", subtotal, discount, vat, shippingCost, total, dueAmount: total, expectedDate: values.expectedDate ? toDate(values.expectedDate) : null, notes: values.notes || null, createdBy: userId, updatedBy: userId, items: { create: items } } });
    });
    refreshProcurement();
    return { success: true, message: `Purchase order ${result.poNo} created.`, data: result };
  } catch (error) { return actionError(error, "Failed to create purchase order."); }
}

export async function updatePurchaseStatus(id, status) {
  try {
    const userId = await requireProcurementPermission("purchase", "update");
    const storeId = await requireCurrentStoreId();
    if (!["DRAFT", "APPROVED", "ORDERED", "CANCELLED"].includes(status)) return { success: false, message: "Invalid purchase status." };
    const current = await prisma.purchaseOrder.findUnique({ where: { id, storeId }, select: { status: true } });
    if (!current) return { success: false, message: "Purchase order not found." };
    if (["PARTIALLY_RECEIVED", "RECEIVED"].includes(current.status) && status === "CANCELLED") return { success: false, message: "A received purchase order cannot be cancelled." };
    await prisma.purchaseOrder.update({ where: { id, storeId }, data: { status, updatedBy: userId } });
    refreshProcurement();
    return { success: true, message: "Purchase status updated." };
  } catch (error) { return actionError(error, "Failed to update purchase status."); }
}
