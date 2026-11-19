"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { actionError, requireProcurementPermission, toNumber } from "@/backend/utils/procurement";
import { assertOwnStockVariants } from "@/backend/services/bundleReservationService";

const refresh = () => ["stock", "ledger", "warehouses", "transfers", "counts", "assembly", "reports"].forEach((s) => revalidatePath(`/admin/inventory/${s}`));
const parseItems = (v) => { try { return JSON.parse(String(v || "[]")); } catch { return []; } };
const serial = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
async function postMovement(tx, { warehouseId, variationId, quantity, unitCost, referenceType = "ADJUSTMENT", referenceId, remarks, userId, type }) {
  await assertOwnStockVariants(tx, [variationId]);
  const old = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId, variationId } } });
  const newQuantity = (old?.quantity || 0) + quantity;
  if (newQuantity < -1e-8) throw new Error(`Insufficient available stock for variation ${variationId}.`);
  if (newQuantity < (old?.reserved || 0) - 1e-8) throw new Error(`Stock is reserved for variation ${variationId}; cancel the reservation or dependent transaction first.`);
  const available = newQuantity - (old?.reserved || 0);
  const movementCost = unitCost !== null && unitCost !== undefined && Number.isFinite(Number(unitCost)) ? Math.max(0, Number(unitCost)) : Math.max(0, old?.averageUnitCost || 0);
  const remainingValue = Math.max(0, (old?.quantity || 0) * (old?.averageUnitCost || 0) + quantity * movementCost);
  const averageUnitCost = newQuantity > 1e-8 ? remainingValue / newQuantity : 0;
  if (old) {
    const updated = await tx.stock.updateMany({
      where: { id: old.id, quantity: old.quantity, reserved: old.reserved },
      data: { quantity: Math.max(0, newQuantity), available: Math.max(0, available), averageUnitCost, updatedBy: userId },
    });
    if (!updated.count) throw new Error("Warehouse stock changed. Refresh and try again.");
  } else {
    await tx.stock.create({ data: { warehouseId, variationId, quantity: Math.max(0, newQuantity), available: Math.max(0, newQuantity), averageUnitCost: movementCost, createdBy: userId, updatedBy: userId } });
  }
  return tx.inventoryTransaction.create({ data: { warehouseId, variationId, type, quantity, balanceAfter: Math.max(0, newQuantity), unitCost: movementCost, referenceType, referenceId, remarks, createdBy: userId } });
}
async function getUnitCost(tx, warehouseId, variationId) {
  const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId, variationId } } });
  if ((stock?.averageUnitCost || 0) > 0 || (stock?.quantity || 0) <= 0) return { stock, unitCost: stock?.averageUnitCost || 0 };
  const receipts = await tx.goodsReceiptItem.findMany({ where: { variationId, goodsReceipt: { is: { status: "COMPLETED" } } }, include: { goodsReceipt: { include: { purchaseOrder: { include: { items: true, expenses: true } } } } } });
  let quantity = 0; let value = 0;
  for (const item of receipts) {
    const po = item.goodsReceipt?.purchaseOrder;
    if (!po) continue;
    const matching = po.items.filter((row) => row.variationId === variationId);
    const matchingQty = matching.reduce((sum, row) => sum + row.quantity, 0);
    const orderedQty = po.items.reduce((sum, row) => sum + row.quantity, 0);
    if (!matchingQty) continue;
    const unitCost = matching.reduce((sum, row) => sum + Math.max(0, row.unitCost - (row.quantity ? row.discount / row.quantity : 0)) * row.quantity, 0) / matchingQty;
    const freight = ((po.shippingCost || 0) + po.expenses.filter((expense) => !expense.voidedAt).reduce((sum, expense) => sum + expense.amount, 0)) / (orderedQty || 1);
    quantity += item.quantity; value += item.quantity * (unitCost + freight);
  }
  const unitCost = quantity > 0 ? value / quantity : null;
  if (unitCost !== null && stock) await tx.stock.update({ where: { id: stock.id }, data: { averageUnitCost: unitCost } });
  return { stock, unitCost };
}
async function ensureNoLaterMovements(tx, transactionIds) {
  const base = await tx.inventoryTransaction.findMany({ where: { id: { in: transactionIds } } });
  for (const movement of base) {
    const later = await tx.inventoryTransaction.findFirst({ where: { warehouseId: movement.warehouseId, variationId: movement.variationId, createdAt: { gt: movement.createdAt }, id: { notIn: transactionIds } }, orderBy: { createdAt: "asc" } });
    if (later) throw new Error(`এই stock-এর ওপর পরে movement আছে (${later.id})। আগে পরের transaction cancel করুন।`);
  }
  return base;
}
export async function setLowStockThreshold(formData) {
  try { const userId = await requireProcurementPermission("inventory", "update"); const warehouseId = String(formData.get("warehouseId") || ""); const variationId = String(formData.get("variationId") || ""); const lowStockThreshold = toNumber(formData.get("threshold"), -1); if (!warehouseId || !variationId || lowStockThreshold < 0) throw new Error("Warehouse, product and non-negative threshold are required."); await prisma.stock.upsert({ where: { warehouseId_variationId: { warehouseId, variationId } }, create: { warehouseId, variationId, lowStockThreshold, createdBy: userId, updatedBy: userId }, update: { lowStockThreshold, updatedBy: userId } }); refresh(); return { success: true, message: "Low-stock threshold saved." }; } catch (e) { return actionError(e, "Could not save threshold."); }
}
export async function getInventoryWarehouseStock(warehouseId) {
  try {
    await requireProcurementPermission("inventory", "view");
    const id = String(warehouseId || "");
    if (!id) return { success: true, data: [] };
    const data = await prisma.stock.findMany({ where: { warehouseId: id }, select: { warehouseId: true, variationId: true, quantity: true, reserved: true, available: true, averageUnitCost: true, variation: { select: { id: true, sku: true, product: { select: { title: true } } } } }, orderBy: { variation: { sku: "asc" } } });
    return { success: true, data };
  } catch (e) { return actionError(e, "Could not load warehouse stock."); }
}
export async function createInventoryTransfer(formData) {
  try { const userId = await requireProcurementPermission("inventory", "create"); const sourceWarehouseId = String(formData.get("sourceWarehouseId") || ""); const destinationWarehouseId = String(formData.get("destinationWarehouseId") || ""); const items = parseItems(formData.get("items")).filter((x) => x.variationId && toNumber(x.quantity) > 0); if (!sourceWarehouseId || !destinationWarehouseId || sourceWarehouseId === destinationWarehouseId || !items.length) throw new Error("Select different source/destination warehouses and add quantities."); await prisma.$transaction(async (tx) => tx.inventoryTransfer.create({ data: { transferNo: serial("TRF"), sourceWarehouseId, destinationWarehouseId, note: String(formData.get("note") || "").slice(0, 500), createdBy: userId, items: { create: items.map((x) => ({ variationId: String(x.variationId), quantity: toNumber(x.quantity) })) } } })); refresh(); return { success: true, message: "Transfer request created." }; } catch (e) { return actionError(e, "Could not create transfer."); }
}
export async function dispatchInventoryTransfer(id) {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const transfer = await tx.inventoryTransfer.findUnique({ where: { id }, include: { items: true } }); if (!transfer || transfer.status !== "REQUESTED") throw new Error("Only requested transfers can be dispatched."); for (const item of transfer.items) { const movement = await postMovement(tx, { warehouseId: transfer.sourceWarehouseId, variationId: item.variationId, quantity: -item.quantity, referenceType: "TRANSFER", referenceId: transfer.id, remarks: `Transfer ${transfer.transferNo} dispatched`, userId, type: "TRANSFER_OUT" }); await tx.inventoryTransferItem.update({ where: { id: item.id }, data: { unitCost: movement.unitCost } }); } await tx.inventoryTransfer.update({ where: { id }, data: { status: "DISPATCHED", updatedBy: userId } }); }); refresh(); return { success: true, message: "Transfer dispatched; source stock reduced." }; } catch (e) { return actionError(e, "Could not dispatch transfer."); }
}
export async function receiveInventoryTransfer(id) {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const transfer = await tx.inventoryTransfer.findUnique({ where: { id }, include: { items: true } }); if (!transfer || transfer.status !== "DISPATCHED") throw new Error("Only dispatched transfers can be received."); for (const item of transfer.items) { await postMovement(tx, { warehouseId: transfer.destinationWarehouseId, variationId: item.variationId, quantity: item.quantity, unitCost: item.unitCost, referenceType: "TRANSFER", referenceId: transfer.id, remarks: `Transfer ${transfer.transferNo} received`, userId, type: "TRANSFER_IN" }); await tx.inventoryTransferItem.update({ where: { id: item.id }, data: { receivedQuantity: item.quantity } }); } await tx.inventoryTransfer.update({ where: { id }, data: { status: "RECEIVED", updatedBy: userId } }); }); refresh(); return { success: true, message: "Transfer received; destination stock updated." }; } catch (e) { return actionError(e, "Could not receive transfer."); }
}
export async function cancelInventoryTransfer(id, reason = "Cancelled by user") {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const t = await tx.inventoryTransfer.findUnique({ where: { id }, include: { items: true } }); if (!t || t.status === "CANCELLED") throw new Error("Transfer is missing or already cancelled."); const moves = await tx.inventoryTransaction.findMany({ where: { referenceType: "TRANSFER", referenceId: id } }); if (moves.length) { const base = await ensureNoLaterMovements(tx, moves.map((m) => m.id)); for (const m of base) await postMovement(tx, { warehouseId: m.warehouseId, variationId: m.variationId, quantity: -m.quantity, unitCost: m.unitCost, referenceType: "TRANSFER", referenceId: id, remarks: `Cancellation reversal of ${m.id}`, userId, type: m.quantity > 0 ? "TRANSFER_OUT" : "TRANSFER_IN" }); } await tx.inventoryTransfer.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: userId, cancelReason: String(reason).slice(0, 300) } }); }); refresh(); return { success: true, message: "Transfer cancelled and stock movements reversed." }; } catch (e) { return actionError(e, "Could not cancel transfer."); }
}
export async function createInventoryCount(formData) {
 try { const userId = await requireProcurementPermission("inventory", "create"); const warehouseId = String(formData.get("warehouseId") || ""); if (!warehouseId) throw new Error("Choose a warehouse."); const ids = parseItems(formData.get("items")).map((x) => String(x.variationId)).filter(Boolean); const stocks = await prisma.stock.findMany({ where: { warehouseId, ...(ids.length ? { variationId: { in: ids } } : {}) }, select: { variationId: true, quantity: true } }); if (!stocks.length) throw new Error("No stock found for this count."); const counts = Object.fromEntries(parseItems(formData.get("items")).map((x) => [String(x.variationId), toNumber(x.countedQuantity, NaN)])); await prisma.inventoryCount.create({ data: { countNo: serial("CNT"), warehouseId, note: String(formData.get("note") || "").slice(0, 500), createdBy: userId, items: { create: stocks.map((s) => ({ variationId: s.variationId, systemQuantity: s.quantity, countedQuantity: Number.isFinite(counts[s.variationId]) ? counts[s.variationId] : null })) } } }); refresh(); return { success: true, message: `Draft stock count created with ${stocks.length} items.` }; } catch (e) { return actionError(e, "Could not create count."); }
}
export async function postInventoryCount(id, formData) {
 try { const userId = await requireProcurementPermission("inventory", "update"); const actual = Object.fromEntries(parseItems(formData.get("items")).map((x) => [String(x.variationId), toNumber(x.countedQuantity, NaN)])); await prisma.$transaction(async (tx) => { const c = await tx.inventoryCount.findUnique({ where: { id }, include: { items: true } }); if (!c || c.status !== "DRAFT") throw new Error("Count is not a draft."); for (const i of c.items) { const later = await tx.inventoryTransaction.findFirst({ where: { warehouseId: c.warehouseId, variationId: i.variationId, createdAt: { gt: c.createdAt } }, orderBy: { createdAt: "asc" } }); if (later) throw new Error(`Count snapshot is stale: movement ${later.id} happened after it started. Cancel that dependent movement first, then create a fresh count.`); const qty = actual[i.variationId]; if (!Number.isFinite(qty) || qty < 0) throw new Error("Enter a valid physical quantity for every row."); const difference = qty - i.systemQuantity; if (difference) await postMovement(tx, { warehouseId: c.warehouseId, variationId: i.variationId, quantity: difference, referenceType: "ADJUSTMENT", referenceId: c.id, remarks: `Stock count ${c.countNo}`, userId, type: "ADJUSTMENT" }); await tx.inventoryCountItem.update({ where: { id: i.id }, data: { countedQuantity: qty } }); } await tx.inventoryCount.update({ where: { id }, data: { status: "POSTED", postedAt: new Date(), postedBy: userId } }); }); refresh(); return { success: true, message: "Count posted; stock balances reconciled." }; } catch (e) { return actionError(e, "Could not post count."); }
}
export async function cancelInventoryCount(id) {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const c = await tx.inventoryCount.findUnique({ where: { id } }); if (!c || c.status === "CANCELLED") throw new Error("Count is missing or already cancelled."); if (c.status === "POSTED") { const moves = await tx.inventoryTransaction.findMany({ where: { referenceType: "ADJUSTMENT", referenceId: id } }); const base = await ensureNoLaterMovements(tx, moves.map((m) => m.id)); for (const m of base) await postMovement(tx, { warehouseId: m.warehouseId, variationId: m.variationId, quantity: -m.quantity, unitCost: m.unitCost, referenceType: "ADJUSTMENT", referenceId: id, remarks: `Count cancellation reversal ${m.id}`, userId, type: "ADJUSTMENT" }); } await tx.inventoryCount.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: userId, cancelReason: "Cancelled by user" } }); }); refresh(); return { success: true, message: "Stock count cancelled." }; } catch (e) { return actionError(e, "Could not cancel count."); }
}
export async function createInventoryBom(formData) {
 try { const userId = await requireProcurementPermission("inventory", "create"); const name = String(formData.get("name") || "").trim(); const outputVariationId = String(formData.get("outputVariationId") || ""); const outputQuantity = toNumber(formData.get("outputQuantity")); const components = parseItems(formData.get("components")).filter((x) => x.variationId && toNumber(x.quantity) > 0); const unique = new Set(components.map((x) => String(x.variationId))); if (!name || !outputVariationId || outputQuantity <= 0 || !components.length || components.some((x) => String(x.variationId) === outputVariationId) || unique.size !== components.length) throw new Error("Enter a recipe name, positive output quantity, and unique components different from the output product."); await prisma.inventoryBom.create({ data: { name: name.slice(0, 150), outputVariationId, outputQuantity, components: { create: components.map((x) => ({ variationId: String(x.variationId), quantity: toNumber(x.quantity) })) } } }); refresh(); return { success: true, message: "Assembly recipe saved." }; } catch (e) { return actionError(e, "Could not save recipe."); }
}
export async function updateInventoryBom(id, formData) {
 try { await requireProcurementPermission("inventory", "update"); const name = String(formData.get("name") || "").trim(); const outputVariationId = String(formData.get("outputVariationId") || ""); const outputQuantity = toNumber(formData.get("outputQuantity")); const components = parseItems(formData.get("components")).filter((x) => x.variationId && toNumber(x.quantity) > 0); const unique = new Set(components.map((x) => String(x.variationId))); if (!name || !outputVariationId || outputQuantity <= 0 || !components.length || components.some((x) => String(x.variationId) === outputVariationId) || unique.size !== components.length) throw new Error("Enter a recipe name, positive output quantity, and unique components different from the output product."); await prisma.$transaction(async (tx) => { const bom = await tx.inventoryBom.findUnique({ where: { id }, include: { _count: { select: { conversions: true } } } }); if (!bom) throw new Error("Recipe not found."); if (bom._count.conversions) throw new Error("This recipe already has conversion history. Disable it and create a new recipe version instead."); await tx.inventoryBom.update({ where: { id }, data: { name: name.slice(0, 150), outputVariationId, outputQuantity } }); await tx.inventoryBomComponent.deleteMany({ where: { bomId: id } }); await tx.inventoryBomComponent.createMany({ data: components.map((x) => ({ bomId: id, variationId: String(x.variationId), quantity: toNumber(x.quantity) })) }); }); refresh(); return { success: true, message: "Recipe updated." }; } catch (e) { return actionError(e, "Could not update recipe."); }
}
export async function setInventoryBomActive(id, active) {
 try { await requireProcurementPermission("inventory", "update"); await prisma.inventoryBom.update({ where: { id }, data: { isActive: Boolean(active) } }); refresh(); return { success: true, message: active ? "Recipe enabled." : "Recipe disabled; history was kept." }; } catch (e) { return actionError(e, "Could not update recipe status."); }
}
export async function runInventoryConversion(formData) {
  try {
    const userId = await requireProcurementPermission("inventory", "create");
    const warehouseId = String(formData.get("warehouseId") || "");
    const bomId = String(formData.get("bomId") || "");
    const type = String(formData.get("type") || "ASSEMBLY");
    const qty = toNumber(formData.get("quantity"));
    const costAllocations = parseItems(formData.get("costAllocations"));
    if (!warehouseId || !bomId || qty <= 0 || !["ASSEMBLY", "DISASSEMBLY"].includes(type)) throw new Error("Choose warehouse, recipe, operation and a positive finished-product quantity.");

    await prisma.$transaction(async (tx) => {
      const bom = await tx.inventoryBom.findUnique({ where: { id: bomId }, include: { components: true } });
      if (!bom?.isActive || !bom.components.length) throw new Error("Recipe is inactive or has no components.");
      const conversion = await tx.inventoryConversion.create({ data: { conversionNo: serial(type === "ASSEMBLY" ? "ASM" : "DSM"), warehouseId, bomId, type, quantity: qty, note: String(formData.get("note") || "").slice(0, 500), createdBy: userId } });
      const factor = qty / bom.outputQuantity;
      const components = [];
      for (const component of bom.components) {
        const cost = await getUnitCost(tx, warehouseId, component.variationId);
        if (type === "ASSEMBLY" && cost.unitCost === null) throw new Error(`Component cost is unavailable for ${component.variationId}. Record its purchase receipt cost first.`);
        components.push({ ...component, unitCost: cost.unitCost, movementQuantity: component.quantity * factor });
      }

      if (type === "ASSEMBLY") {
        const existingOutputCost = await getUnitCost(tx, warehouseId, bom.outputVariationId);
        if ((existingOutputCost.stock?.quantity || 0) > 0 && existingOutputCost.unitCost === null) throw new Error("Existing finished-product stock has no recorded cost. Add its purchase cost before assembling more into it.");
        const totalComponentCost = components.reduce((sum, component) => sum + component.movementQuantity * component.unitCost, 0);
        const outputUnitCost = totalComponentCost / qty;
        for (const component of components) await postMovement(tx, { warehouseId, variationId: component.variationId, quantity: -component.movementQuantity, unitCost: component.unitCost, referenceType: "ADJUSTMENT", referenceId: conversion.id, remarks: `${type} ${conversion.conversionNo}; cost carried into output`, userId, type: "OUT" });
        await postMovement(tx, { warehouseId, variationId: bom.outputVariationId, quantity: qty, unitCost: outputUnitCost, referenceType: "ADJUSTMENT", referenceId: conversion.id, remarks: `${type} ${conversion.conversionNo}; component cost ${totalComponentCost.toFixed(4)}`, userId, type: "IN" });
      } else {
        const finished = await getUnitCost(tx, warehouseId, bom.outputVariationId);
        if (finished.unitCost === null) throw new Error("Finished-product cost is unavailable. Record its cost before disassembly.");
        const totalFinishedCost = qty * finished.unitCost;
        const allocationMap = new Map(costAllocations.map((row) => [String(row.variationId), toNumber(row.cost, -1)]));
        if (allocationMap.size !== components.length || components.some((component) => !allocationMap.has(component.variationId) || allocationMap.get(component.variationId) < 0)) throw new Error("Enter a non-negative cost allocation for each returned component.");
        const allocatedTotal = [...allocationMap.values()].reduce((sum, cost) => sum + cost, 0);
        if (Math.abs(allocatedTotal - totalFinishedCost) > 0.01) throw new Error(`Component allocations must total ৳${totalFinishedCost.toFixed(2)} (the finished product's current cost).`);
        for (const component of components) {
          const allocatedCost = allocationMap.get(component.variationId);
          await postMovement(tx, { warehouseId, variationId: component.variationId, quantity: component.movementQuantity, unitCost: allocatedCost / component.movementQuantity, referenceType: "ADJUSTMENT", referenceId: conversion.id, remarks: `${type} ${conversion.conversionNo}; allocated cost ${allocatedCost.toFixed(4)}`, userId, type: "RETURN_IN" });
        }
        await postMovement(tx, { warehouseId, variationId: bom.outputVariationId, quantity: -qty, unitCost: finished.unitCost, referenceType: "ADJUSTMENT", referenceId: conversion.id, remarks: `${type} ${conversion.conversionNo}; cost distributed to components`, userId, type: "OUT" });
      }
    });
    refresh();
    return { success: true, message: `${type === "ASSEMBLY" ? "Assembly cost rolled into finished product." : "Finished-product cost allocated to components."}` };
  } catch (e) { return actionError(e, "Could not post conversion."); }
}
export async function cancelInventoryConversion(id) {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const c = await tx.inventoryConversion.findUnique({ where: { id } }); if (!c || c.status === "CANCELLED") throw new Error("Conversion is missing or already cancelled."); const moves = await tx.inventoryTransaction.findMany({ where: { referenceType: "ADJUSTMENT", referenceId: id } }); const base = await ensureNoLaterMovements(tx, moves.map((m) => m.id)); for (const m of base) await postMovement(tx, { warehouseId: m.warehouseId, variationId: m.variationId, quantity: -m.quantity, unitCost: m.unitCost, referenceType: "ADJUSTMENT", referenceId: id, remarks: `Conversion cancellation reversal ${m.id}`, userId, type: m.quantity > 0 ? "OUT" : "IN" }); await tx.inventoryConversion.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: userId, cancelReason: "Cancelled by user" } }); }); refresh(); return { success: true, message: "Conversion cancelled and stock reversed." }; } catch (e) { return actionError(e, "Could not cancel conversion."); }
}
export async function cancelInventoryMovement(id) {
 try { const userId = await requireProcurementPermission("inventory", "update"); await prisma.$transaction(async (tx) => { const movement = await tx.inventoryTransaction.findUnique({ where: { id } }); if (!movement) throw new Error("Movement not found."); if (movement.referenceType !== "ADJUSTMENT" || movement.referenceId) throw new Error("Linked movement cancel করতে সংশ্লিষ্ট transfer, count বা assembly record থেকেই cancel করুন।"); const alreadyReversed = await tx.inventoryTransaction.findFirst({ where: { referenceId: id, remarks: { startsWith: "Cancellation reversal" } } }); if (alreadyReversed) throw new Error("Movement is already cancelled."); const later = await tx.inventoryTransaction.findFirst({ where: { warehouseId: movement.warehouseId, variationId: movement.variationId, createdAt: { gt: movement.createdAt } }, orderBy: { createdAt: "asc" } }); if (later) throw new Error(`পরে stock movement আছে (${later.id})। আগে সেটি cancel করুন।`); await postMovement(tx, { warehouseId: movement.warehouseId, variationId: movement.variationId, quantity: -movement.quantity, unitCost: movement.unitCost, referenceType: "ADJUSTMENT", referenceId: movement.id, remarks: `Cancellation reversal of ${movement.id}`, userId, type: movement.quantity > 0 ? "OUT" : "IN" }); }); refresh(); return { success: true, message: "Movement reversed." }; } catch (e) { return actionError(e, "Could not cancel movement."); }
}
