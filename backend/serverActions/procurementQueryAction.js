"use server";

import prisma from "@/lib/prisma";
import { actionError, PROCUREMENT_RESOURCES, requireProcurementPermission } from "../utils/procurement";

const emptyData = () => ({ suppliers: [], warehouses: [], purchaseOrders: [], receipts: [], stocks: [], transactions: [], payments: [], pendingPayments: [], moneyAccounts: [], expenses: [], expenseCategories: [], variations: [], deliveries: [], orders: [], batches: [] });
const dates = (startDate, endDate) => startDate || endDate ? { ...(startDate && { gte: new Date(`${startDate}T00:00:00`) }), ...(endDate && { lte: new Date(`${endDate}T23:59:59.999`) }) } : undefined;
const text = (value, search) => ({ [value]: { contains: search, mode: "insensitive" } });

export async function getProcurementSectionData(section, params = {}) {
  try {
    const resource = PROCUREMENT_RESOURCES[section];
    if (!resource) return { success: false, message: "Unknown procurement section." };
    await requireProcurementPermission(resource, "view");
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(params.limit) || 10));
    const skip = (page - 1) * limit;
    const search = String(params.search || "").trim();
    const status = params.status && params.status !== "ALL" ? params.status : undefined;
    const date = dates(params.startDate, params.endDate);
    const data = emptyData();
    let total = 0;

    if (section === "purchases") {
      const where = { ...(status && { status }), ...(date && { createdAt: date }), ...(search && { OR: [text("poNo", search), { supplier: text("companyName", search) }] }) };
      [data.suppliers, data.variations, data.purchaseOrders, total] = await Promise.all([
        prisma.supplier.findMany({ where: { isActive: true }, orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
        prisma.productVariation.findMany({ where: { productId: { not: null } }, orderBy: { sku: "asc" }, take: 500, include: { product: { select: { title: true } } } }),
        prisma.purchaseOrder.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { supplier: { select: { companyName: true } }, items: { include: { product: { select: { title: true } }, variation: { select: { sku: true } } } }, _count: { select: { receipts: true, supplierPayments: true, expenses: true } } } }),
        prisma.purchaseOrder.count({ where }),
      ]);
    } else if (section === "receipts") {
      const where = { ...(status && { status }), ...(date && { createdAt: date }), ...(search && { OR: [text("grnNo", search), { purchaseOrder: text("poNo", search) }, { items: { some: { OR: [text("batchNumber", search), text("supplierLotNumber", search)] } } }] }) };
      [data.warehouses, data.purchaseOrders, data.receipts, total] = await Promise.all([
        prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }] }),
        prisma.purchaseOrder.findMany({ where: { status: { in: ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED"] } }, orderBy: { createdAt: "desc" }, include: { supplier: { select: { companyName: true } }, items: { include: { product: { select: { title: true } }, variation: { select: { sku: true } } } } } }),
        prisma.goodsReceipt.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { purchaseOrder: { select: { poNo: true, _count: { select: { supplierPayments: true } } } }, warehouse: { select: { name: true } }, items: { include: { _count: { select: { deliveryItems: true } } } } } }),
        prisma.goodsReceipt.count({ where }),
      ]);
    } else if (section === "stock") {
      const where = { ...(params.warehouseId && { warehouseId: params.warehouseId }), ...(search && { OR: [{ variation: text("sku", search) }, { variation: { product: text("title", search) } }, { warehouse: text("name", search) }] }) };
      [data.warehouses, data.variations, data.stocks, total] = await Promise.all([
        prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
        prisma.productVariation.findMany({ where: { productId: { not: null } }, take: 500, include: { product: { select: { title: true } } } }),
        prisma.stock.findMany({ where, skip, take: limit, orderBy: { updatedAt: "desc" }, include: { warehouse: true, variation: { include: { product: true } } } }),
        prisma.stock.count({ where }),
      ]);
    } else if (section === "ledger") {
      const where = { ...(params.warehouseId && { warehouseId: params.warehouseId }), ...(status && { type: status }), ...(date && { createdAt: date }), ...(search && { OR: [{ variation: text("sku", search) }, { variation: { product: text("title", search) } }, { warehouse: text("name", search) }, text("remarks", search)] }) };
      [data.warehouses, data.transactions, total] = await Promise.all([
        prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
        prisma.inventoryTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { warehouse: true, variation: { include: { product: true } } } }),
        prisma.inventoryTransaction.count({ where }),
      ]);
    } else if (section === "warehouses") {
      const where = search ? { OR: [text("name", search), text("code", search), text("manager", search)] } : {};
      [data.warehouses, total] = await Promise.all([prisma.warehouse.findMany({ where, skip, take: limit, orderBy: { name: "asc" }, include: { _count: { select: { stocks: true, goodsReceipt: true, deliveries: true } } } }), prisma.warehouse.count({ where })]);
    } else if (section === "payments") {
      const where = { ...(date && { paidAt: date }), ...(search && { OR: [text("reference", search), { supplier: text("companyName", search) }, { purchaseOrder: text("poNo", search) }] }) };
      const pendingWhere = { status: { in: ["PARTIALLY_RECEIVED", "RECEIVED"] }, dueAmount: { gt: 0 }, ...(search && { OR: [text("poNo", search), { supplier: text("companyName", search) }] }) };
      [data.payments, data.pendingPayments, data.moneyAccounts, total] = await Promise.all([
        prisma.supplierPayment.findMany({ where, skip, take: limit, orderBy: { paidAt: "desc" }, include: { supplier: true, purchaseOrder: true, moneyAccount: true } }),
        prisma.purchaseOrder.findMany({ where: pendingWhere, skip, take: limit, orderBy: { createdAt: "desc" }, include: { supplier: true } }),
        prisma.moneyAccount.findMany({ where: { isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
        prisma.purchaseOrder.count({ where: pendingWhere }),
      ]);
    } else if (section === "expenses") {
      const where = { ...(date && { expenseDate: date }), ...(search && { OR: [text("description", search), { category: text("name", search) }] }) };
      [data.expenses, data.expenseCategories, data.moneyAccounts, data.purchaseOrders, total] = await Promise.all([prisma.expense.findMany({ where, skip, take: limit, orderBy: { expenseDate: "desc" }, include: { category: true, moneyAccount: true, purchaseOrder: { select: { id: true, poNo: true } } } }), prisma.expenseCategory.findMany({ orderBy: { name: "asc" } }), prisma.moneyAccount.findMany({ where: { isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }), prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, poNo: true, status: true, supplier: { select: { companyName: true } }, items: { select: { id: true, variationId: true, quantity: true, receivedQty: true, product: { select: { title: true } }, variation: { select: { sku: true } } } } } }), prisma.expense.count({ where })]);
    } else if (section === "deliveries") {
      const where = { ...(status && { status }), ...(date && { createdAt: date }), ...(search && { OR: [text("deliveryNo", search), { order: text("orderNo", search) }, { items: { some: { goodsReceiptItem: { OR: [text("batchNumber", search), text("supplierLotNumber", search)] } } } }] }) };
      const queueWhere = {
        status: { in: ["PROCESSING", "READY_TO_SHIP"] },
        OR: [
          { shipping: { isNot: null } },
          { selectedCourierProviderId: { not: null } },
        ],
        ...(date && { createdAt: date }),
        ...(search && {
          OR: [
            text("orderNo", search),
            text("customerName", search),
            text("phoneNumber", search),
          ],
        }),
      };
      let deliveryTotal = 0;
      let queueTotal = 0;
      [data.deliveries, data.orders, data.warehouses, data.batches, deliveryTotal, queueTotal] = await Promise.all([
        prisma.delivery.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" }, include: { order: { include: { orderItems: true, shipping: true, selectedCourierProvider: true } }, warehouse: true, items: { include: { orderItem: true, goodsReceiptItem: true } } } }),
        prisma.order.findMany({ where: queueWhere, skip, take: limit, orderBy: { createdAt: "asc" }, include: { orderItems: true, shipping: true, selectedCourierProvider: true } }),
        prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
        prisma.goodsReceiptItem.findMany({ where: { batchNumber: { not: null }, supplierLotNumber: { not: null }, goodsReceipt: { isNot: null } }, take: 500, include: { variation: { include: { product: true } }, goodsReceipt: { include: { warehouse: true } } } }),
        prisma.delivery.count({ where }),
        prisma.order.count({ where: queueWhere }),
      ]);
      total = params.view === "prepared" ? deliveryTotal : queueTotal;
    }
    return { success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, filters: params };
  } catch (error) {
    return actionError(error, "Failed to load procurement data.");
  }
}
