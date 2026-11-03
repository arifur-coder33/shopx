"use server";

import prisma from "@/lib/prisma";
import { actionError, PROCUREMENT_RESOURCES, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";

export async function getProcurementDetail(section, id) {
  try {
    const resource = PROCUREMENT_RESOURCES[section];
    if (!resource) return { success: false, message: "Unknown procurement section." };
    await requireProcurementPermission(resource, "view");
    let data;
    if (section === "purchases") data = await prisma.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, items: { include: { product: true, variation: true } }, receipts: { include: { warehouse: true, items: true } }, supplierPayments: true, expenses: { include: { category: true }, orderBy: { expenseDate: "asc" } } } });
    if (section === "receipts") data = await prisma.goodsReceipt.findUnique({ where: { id }, include: { purchaseOrder: { include: { supplier: true } }, warehouse: true, items: { include: { variation: { include: { product: true } }, deliveryItems: { include: { delivery: { include: { order: true } } } } } } } });
    if (section === "deliveries") data = await prisma.delivery.findUnique({ where: { id }, include: { order: true, warehouse: true, items: { include: { orderItem: true, goodsReceiptItem: true } } } });
    if (section === "warehouses") data = await prisma.warehouse.findUnique({ where: { id }, include: { stocks: { include: { variation: { include: { product: true } } } } } });
    if (section === "stock") data = await prisma.stock.findUnique({ where: { id }, include: { warehouse: true, variation: { include: { product: true } } } });
    if (section === "stock" && data) data.transactions = await prisma.inventoryTransaction.findMany({ where: { warehouseId: data.warehouseId, variationId: data.variationId }, orderBy: { createdAt: "desc" }, take: 200 });
    if (section === "ledger") data = await prisma.inventoryTransaction.findUnique({ where: { id }, include: { warehouse: true, variation: { include: { product: true } } } });
    if (section === "expenses") data = await prisma.expense.findUnique({ where: { id }, include: { category: true, purchaseOrder: true } });
    if (section === "payments") data = await prisma.supplierPayment.findUnique({ where: { id }, include: { supplier: true, purchaseOrder: true } });
    if (!data) return { success: false, message: "Record not found." };
    const auditIds = [...new Set([data.createdBy, data.updatedBy, data.voidedBy].filter(Boolean))];
    const users = auditIds.length ? await prisma.user.findMany({ where: { id: { in: auditIds } }, select: { id: true, email: true } }) : [];
    let capabilities = { canEdit: false, canDelete: false, reason: "This record is controlled by its workflow." };
    if (section === "purchases") {
      const locked = data.receipts.length > 0 || data.supplierPayments.length > 0 || data.expenses.length > 0;
      capabilities = { canEdit: !locked, canDelete: !locked, reason: locked ? "Goods have been received or a supplier payment or linked expense exists." : "" };
    } else if (section === "receipts") {
      const delivered = data.items.some((item) => item.deliveryItems.length > 0 || item.deliveredQuantity > 0);
      const paid = await prisma.supplierPayment.count({ where: { purchaseOrderId: data.purchaseOrderId } });
      const locked = delivered || paid > 0;
      capabilities = { canEdit: !locked, canDelete: !locked, reason: delivered ? "Stock from this receipt has been delivered." : paid ? "A supplier payment exists for this purchase order." : "" };
    } else if (section === "warehouses") {
      const [receipts, deliveries] = await Promise.all([prisma.goodsReceipt.count({ where: { warehouseId: id } }), prisma.delivery.count({ where: { warehouseId: id } })]);
      const locked = data.stocks.some((stock) => stock.quantity !== 0 || stock.reserved !== 0) || receipts > 0 || deliveries > 0;
      capabilities = { canEdit: true, canDelete: !locked && !data.isDefault, reason: data.isDefault ? "The default warehouse cannot be deleted." : locked ? "This warehouse has stock, receipts, or deliveries." : "" };
    } else if (section === "deliveries") capabilities = { canEdit: data.status !== "DELIVERED", canDelete: false, reason: data.status === "DELIVERED" ? "A delivered shipment is locked." : "Delivery deletion requires reversing allocated stock." };
    else if (["expenses", "payments"].includes(section)) capabilities = { canEdit: false, canDelete: false, reason: "A posted journal or money transaction depends on this record." };
    return { success: true, data, capabilities, users: Object.fromEntries(users.map((user) => [user.id, user.email])) };
  } catch (error) {
    return actionError(error, "Failed to load record details.");
  }
}

export async function updateProcurementRecord(section, id, formData) {
  try {
    const resource = PROCUREMENT_RESOURCES[section];
    const userId = await requireProcurementPermission(resource, "update");
    const values = Object.fromEntries(formData.entries());
    if (section === "warehouses") {
      if (!values.name?.trim()) throw new Error("Warehouse name is required.");
      await prisma.warehouse.update({ where: { id }, data: { name: values.name.trim(), address: values.address || null, phone: values.phone || null, manager: values.manager || null, updatedBy: userId } });
    } else if (section === "purchases") {
      const locked = await prisma.goodsReceipt.count({ where: { purchaseOrderId: id } }) || await prisma.supplierPayment.count({ where: { purchaseOrderId: id } }) || await prisma.expense.count({ where: { purchaseOrderId: id } });
      if (locked) throw new Error("This purchase order is locked because it has a receipt or payment.");
      const current = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!current) throw new Error("Purchase order not found.");
      const rows = current.items.map((item) => { const quantity = toNumber(values[`quantity_${item.id}`], item.quantity), unitCost = toNumber(values[`unitCost_${item.id}`], item.unitCost), discount = toNumber(values[`discount_${item.id}`], item.discount); if (quantity <= 0 || unitCost < 0 || discount < 0) throw new Error("Purchase item values are invalid."); return { id: item.id, quantity, unitCost, discount, total: quantity * unitCost - discount }; });
      const subtotal = rows.reduce((sum, row) => sum + row.quantity * row.unitCost, 0), discount = toNumber(values.discount), vat = toNumber(values.vat), shippingCost = toNumber(values.shippingCost), total = Math.max(0, subtotal - discount + vat + shippingCost);
      await prisma.$transaction([prisma.purchaseOrder.update({ where: { id }, data: { status: ["DRAFT", "APPROVED", "ORDERED", "CANCELLED"].includes(values.status) ? values.status : current.status, subtotal, discount, vat, shippingCost, total, dueAmount: total, expectedDate: values.expectedDate ? toDate(values.expectedDate) : null, notes: values.notes || null, updatedBy: userId } }), ...rows.map((row) => prisma.purchaseItem.update({ where: { id: row.id }, data: { quantity: row.quantity, unitCost: row.unitCost, discount: row.discount, total: row.total } }))]);
    } else if (section === "receipts") {
      const receipt = await prisma.goodsReceipt.findUnique({ where: { id }, include: { items: { include: { deliveryItems: true } } } });
      if (!receipt) throw new Error("Goods receipt not found.");
      const paid = await prisma.supplierPayment.count({ where: { purchaseOrderId: receipt.purchaseOrderId } });
      if (paid || receipt.items.some((item) => item.deliveryItems.length || item.deliveredQuantity > 0)) throw new Error("This goods receipt has a dependent payment or delivery.");
      await prisma.$transaction(receipt.items.map((item) => prisma.goodsReceiptItem.update({ where: { id: item.id }, data: { supplierLotNumber: String(values[`lot_${item.id}`] || item.supplierLotNumber || "").trim() } })));
    } else if (section === "deliveries") {
      const status = ["PACKED", "SHIPPED", "DELIVERED"].includes(values.status) ? values.status : "PACKED";
      const delivery = await prisma.delivery.update({ where: { id }, data: { status, note: values.note || null, deliveredAt: status === "DELIVERED" ? new Date() : null, updatedBy: userId } });
      if (status === "SHIPPED") await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "SHIPPED" } });
      if (status === "DELIVERED") await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
    } else if (section === "expenses") {
      const amount = toNumber(values.amount);
      if (amount <= 0) throw new Error("Expense amount is required.");
      await prisma.expense.update({ where: { id }, data: { amount, description: values.description || null, expenseDate: toDate(values.expenseDate), paymentMethod: values.paymentMethod || null, updatedBy: userId } });
    } else if (section === "payments") {
      await prisma.supplierPayment.update({ where: { id }, data: { paymentMethod: values.paymentMethod, reference: values.reference || null, paidAt: toDate(values.paidAt), updatedBy: userId } });
    } else throw new Error("This record is updated through its controlled workflow.");
    refreshProcurement();
    return { success: true, message: "Record updated." };
  } catch (error) {
    return actionError(error, "Failed to update record.");
  }
}

export async function deleteProcurementRecord(section, id) {
  try {
    const resource = PROCUREMENT_RESOURCES[section];
    const userId = await requireProcurementPermission(resource, "delete");
    if (section === "purchases") {
      const [receipts, payments, expenses] = await Promise.all([prisma.goodsReceipt.count({ where: { purchaseOrderId: id } }), prisma.supplierPayment.count({ where: { purchaseOrderId: id } }), prisma.expense.count({ where: { purchaseOrderId: id } })]);
      if (receipts || payments || expenses) throw new Error("Purchase order cannot be deleted after receipt, payment or linked expense.");
      await prisma.purchaseOrder.delete({ where: { id } });
    } else if (section === "receipts") {
      await prisma.$transaction(async (tx) => {
        const receipt = await tx.goodsReceipt.findUnique({ where: { id }, include: { items: { include: { deliveryItems: true } }, purchaseOrder: { include: { items: true } } } });
        if (!receipt) throw new Error("Goods receipt not found.");
        const paid = await tx.supplierPayment.count({ where: { purchaseOrderId: receipt.purchaseOrderId } });
        if (paid || receipt.items.some((item) => item.deliveryItems.length || item.deliveredQuantity > 0)) throw new Error("Receipt cannot be deleted after payment or delivery.");
        for (const item of receipt.items) {
          const stock = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId: receipt.warehouseId, variationId: item.variationId } } });
          if (!stock || stock.quantity < item.quantity || stock.available < item.quantity) throw new Error("Receipt stock has already been consumed or adjusted.");
          await tx.stock.update({ where: { id: stock.id }, data: { quantity: { decrement: item.quantity }, available: { decrement: item.quantity }, updatedBy: userId } });
          const purchaseItem = receipt.purchaseOrder.items.find((row) => row.variationId === item.variationId && row.receivedQty >= item.quantity);
          if (!purchaseItem) throw new Error("Could not safely match the receipt to its purchase item.");
          await tx.purchaseItem.update({ where: { id: purchaseItem.id }, data: { receivedQty: { decrement: item.quantity } } });
        }
        await tx.inventoryTransaction.deleteMany({ where: { referenceId: id, referenceType: "PURCHASE" } });
        const journals = await tx.journalEntry.findMany({ where: { referenceId: id, referenceType: "GOODS_RECEIPT" }, select: { id: true } });
        if (journals.length) await tx.journalLine.deleteMany({ where: { journalEntryId: { in: journals.map((row) => row.id) } } });
        await tx.journalEntry.deleteMany({ where: { id: { in: journals.map((row) => row.id) } } });
        await tx.goodsReceipt.delete({ where: { id } });
        const remaining = await tx.purchaseItem.findMany({ where: { purchaseOrderId: receipt.purchaseOrderId } });
        const status = remaining.every((item) => item.receivedQty <= 0) ? "ORDERED" : remaining.every((item) => item.receivedQty >= item.quantity) ? "RECEIVED" : "PARTIALLY_RECEIVED";
        await tx.purchaseOrder.update({ where: { id: receipt.purchaseOrderId }, data: { status, updatedBy: userId } });
      });
    } else if (section === "warehouses") {
      const warehouse = await prisma.warehouse.findUnique({ where: { id } });
      const dependencies = await Promise.all([prisma.stock.count({ where: { warehouseId: id, OR: [{ quantity: { not: 0 } }, { reserved: { not: 0 } }] } }), prisma.goodsReceipt.count({ where: { warehouseId: id } }), prisma.delivery.count({ where: { warehouseId: id } })]);
      if (warehouse?.isDefault || dependencies.some(Boolean)) throw new Error("Warehouse has dependent stock or documents.");
      await prisma.warehouse.delete({ where: { id } });
    } else throw new Error("This record cannot be safely deleted because dependent accounting or stock records exist.");
    refreshProcurement();
    return { success: true, message: "Record deleted." };
  } catch (error) { return actionError(error, "Failed to delete record."); }
}
