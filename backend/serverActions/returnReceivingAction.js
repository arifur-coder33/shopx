"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireProcurementPermission, actionError } from "@/backend/utils/procurement";
import { generateCode } from "@/backend/utils/generateCode";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "@/backend/utils/accounting";
import { postMoneyTransaction } from "@/backend/services/moneyTransactionService";

export async function getReturnReceivingData() {
  try {
    await requireProcurementPermission("delivery", "view");
    const [orders, warehouses, accounts] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ["RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED"] } },
        orderBy: { updatedAt: "desc" }, take: 100,
        select: { id: true, orderNo: true, customerName: true, phoneNumber: true, status: true, paymentMethod: true, paidAmount: true, deliveryCharge: true, deliveryDiscount: true, orderItems: { select: { id: true, productName: true, sku: true, price: true, quantity: true, variationId: true, deliveryItems: { select: { quantity: true } }, returnItems: { select: { quantity: true } } } } },
      }),
      prisma.warehouse.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
      prisma.moneyAccount.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true } }),
    ]);
    const availableOrders = orders.map((order) => ({ ...order, orderItems: order.orderItems.map((item) => ({ ...item, receivedQuantity: Math.max(0, item.deliveryItems.reduce((sum, row) => sum + row.quantity, 0) - item.returnItems.reduce((sum, row) => sum + row.quantity, 0)) })).filter((item) => item.receivedQuantity > 0) })).filter((order) => order.orderItems.length);
    return { success: true, data: { orders: availableOrders, warehouses, accounts } };
  } catch (error) { return actionError(error, "Could not load return deliveries."); }
}

export async function searchOrderForReturnReceiving(orderNo) {
  try {
    await requireProcurementPermission("delivery", "view");
    const number = String(orderNo || "").trim();
    if (!number) return { success: false, message: "Enter an order number." };
    const order = await prisma.order.findUnique({
      where: { orderNo: number },
      select: { id: true, orderNo: true, customerName: true, phoneNumber: true, status: true, paymentMethod: true, paidAmount: true, deliveryCharge: true, deliveryDiscount: true, orderItems: { select: { id: true, productName: true, sku: true, price: true, quantity: true, variationId: true, deliveryItems: { select: { quantity: true } }, returnItems: { select: { quantity: true } } } } },
    });
    if (!order) return { success: false, message: "Order number not found." };
    const data = { ...order, orderItems: order.orderItems.map((item) => ({ ...item, receivedQuantity: Math.max(0, item.deliveryItems.reduce((sum, row) => sum + row.quantity, 0) - item.returnItems.reduce((sum, row) => sum + row.quantity, 0)) })).filter((item) => item.receivedQuantity > 0) };
    if (!data.orderItems.length) return { success: false, message: "This order has no delivered quantity left to return." };
    return { success: true, data };
  } catch (error) { return actionError(error, "Could not find this order."); }
}

export async function receiveReturnedOrder(formData) {
  try {
    const userId = await requireProcurementPermission("delivery", "create");
    const values = Object.fromEntries(formData.entries());
    const orderId = String(values.orderId || "");
    const warehouseId = String(values.warehouseId || "");
    const reasonType = values.reasonType;
    const description = String(values.description || "").trim().slice(0, 1000);
    const items = JSON.parse(String(values.items || "[]")).map((item) => ({ orderItemId: String(item.orderItemId || ""), quantity: Number(item.quantity), disposition: item.disposition })).filter((item) => item.orderItemId && Number.isFinite(item.quantity) && item.quantity > 0);
    if (!orderId || !warehouseId || !["DELIVERY_FAIL", "CUSTOMER_RETURN"].includes(reasonType) || !description || !items.length) throw new Error("Order, warehouse, reason, description and at least one item are required.");

    let queuedRefundAmount = 0;
    let refundQueueNote = "No refundable paid balance.";
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId }, include: { deliveries: { select: { id: true } }, orderItems: { include: { deliveryItems: true, returnItems: true } }, payments: { where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } }, include: { refunds: { where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } }, select: { amount: true, status: true } } } }, refunds: { where: { status: { in: ["PENDING", "APPROVED", "COMPLETED"] } }, select: { amount: true, status: true } } } });
      const allowedStatuses = reasonType === "DELIVERY_FAIL"
        ? ["RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED"]
        : ["DELIVERED", "RETURNING", "FAILED_RETURNING", "DELIVERY_FAILED", "RETURNED", "REFUNDING"];
      if (!order || !allowedStatuses.includes(order.status)) throw new Error("This order is not eligible for the selected return type.");
      const warehouse = await tx.warehouse.findUnique({ where: { id: warehouseId }, select: { id: true } });
      if (!warehouse) throw new Error("Warehouse not found.");
      const orderItems = new Map(order.orderItems.map((item) => [item.id, item]));
      for (const item of items) {
        if (!["RESTOCK", "DISPOSE"].includes(item.disposition)) throw new Error("Choose restock or dispose for every returned item.");
        const source = orderItems.get(item.orderItemId);
        if (!source) throw new Error("A returned item does not belong to this order.");
        const delivered = source.deliveryItems.reduce((sum, row) => sum + row.quantity, 0);
        const previouslyReturned = source.returnItems.reduce((sum, row) => sum + row.quantity, 0);
        if (item.quantity > delivered - previouslyReturned) throw new Error(`Return quantity exceeds the unreceived quantity for ${source.sku}.`);
      }
      const disposeItems = items.filter((item) => item.disposition === "DISPOSE");
      const disposalCosts = new Map();
      for (const item of disposeItems) {
        const source = orderItems.get(item.orderItemId);
        const receivedLots = await tx.goodsReceiptItem.findMany({
          where: { variationId: source.variationId, goodsReceipt: { is: { warehouseId } } },
          select: {
            quantity: true,
            goodsReceipt: {
              select: {
                purchaseOrder: {
                  select: {
                    shippingCost: true,
                    items: {
                      select: {
                        variationId: true,
                        quantity: true,
                        unitCost: true,
                        discount: true,
                      },
                    },
                    expenses: { where: { voidedAt: null }, select: { amount: true } },
                  },
                },
              },
            },
          },
        });
        let weightedCost = 0;
        let weightedQuantity = 0;
        for (const lot of receivedLots) {
          const po = lot.goodsReceipt?.purchaseOrder;
          const matching = (po?.items || []).filter((entry) => entry.variationId === source.variationId);
          const matchingQty = matching.reduce((sum, entry) => sum + entry.quantity, 0);
          const poQty = (po?.items || []).reduce((sum, entry) => sum + entry.quantity, 0);
          if (!po || matchingQty <= 0 || poQty <= 0) continue;
          const unit = matching.reduce((sum, entry) => sum + Math.max(0, entry.unitCost - (entry.quantity ? entry.discount / entry.quantity : 0)) * entry.quantity, 0) / matchingQty + ((po.shippingCost || 0) + (po.expenses || []).reduce((sum, expense) => sum + expense.amount, 0)) / poQty;
          weightedCost += unit * lot.quantity;
          weightedQuantity += lot.quantity;
        }
        let unitCost = weightedQuantity > 0 ? weightedCost / weightedQuantity : 0;
        if (!unitCost) {
          const latestPurchase = await tx.purchaseItem.findFirst({ where: { variationId: source.variationId, purchaseOrder: { status: { in: ["ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"] } } }, orderBy: { createdAt: "desc" }, select: { quantity: true, unitCost: true, discount: true } });
          if (latestPurchase) unitCost = Math.max(0, latestPurchase.unitCost - (latestPurchase.quantity ? latestPurchase.discount / latestPurchase.quantity : 0));
        }
        if (!unitCost) throw new Error(`Buy price is unavailable for ${source.sku}; add a purchase receipt or purchase order cost before disposing it.`);
        disposalCosts.set(item.orderItemId, unitCost * item.quantity);
      }
      const receipt = await tx.returnReceipt.create({ data: { orderId, reasonType, description, createdBy: userId } });
      const hasAdvancePayment = order.payments.some((payment) => payment.paymentMethod !== "COD");
      const shouldQueueRefund = Number(order.paidAmount || 0) > 0 && order.payments.length > 0
        && (reasonType === "CUSTOMER_RETURN" || hasAdvancePayment);
      if (reasonType === "DELIVERY_FAIL" && Number(order.paidAmount || 0) > 0 && !hasAdvancePayment) {
        refundQueueNote = "COD delivery failure does not create a refund.";
      } else if (Number(order.paidAmount || 0) > 0 && !order.payments.length) {
        refundQueueNote = "A refund was not queued because no posted payment record is linked to this order.";
      }
      if (shouldQueueRefund) {
        const grossItems = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const returnedGross = items.reduce((sum, item) => sum + orderItems.get(item.orderItemId).price * item.quantity, 0);
        const productRefund = grossItems > 0
          ? returnedGross * Math.max(0, Number(order.orderPrice || 0) - Number(order.adminDiscount || 0)) / grossItems
          : 0;
        const reservedRefund = order.refunds.reduce((sum, refund) => sum + refund.amount, 0);
        const paidRefundable = Math.max(0, order.payments.reduce((sum, payment) => sum + payment.amount, 0) - reservedRefund);
        let remainingRefund = Math.round(Math.min(productRefund, paidRefundable) * 100) / 100;
        for (const payment of order.payments) {
          if (remainingRefund <= 0) break;
          const reservedOnPayment = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
          const available = Math.max(0, Math.round((payment.amount - reservedOnPayment) * 100) / 100);
          const amount = Math.min(remainingRefund, available);
          if (amount <= 0) continue;
          await tx.refund.create({ data: { orderId, returnReceiptId: receipt.id, paymentId: payment.id, moneyAccountId: payment.moneyAccountId, amount, reason: `${reasonType === "DELIVERY_FAIL" ? "Delivery fail" : "Customer return"} · Order ${order.orderNo}`, adminNote: description, status: "PENDING" } });
          queuedRefundAmount += amount;
          remainingRefund = Math.round((remainingRefund - amount) * 100) / 100;
        }
      }
      for (const item of items) {
        const source = orderItems.get(item.orderItemId);
        await tx.returnReceiptItem.create({ data: { returnReceiptId: receipt.id, orderItemId: source.id, variationId: source.variationId, warehouseId, quantity: item.quantity, disposition: item.disposition } });
        if (item.disposition === "RESTOCK") {
          const saleMovements = await tx.inventoryTransaction.findMany({ where: { referenceType: "SALE", referenceId: { in: [order.id, ...order.deliveries.map((delivery) => delivery.id)] }, variationId: source.variationId, type: "OUT" }, select: { quantity: true, unitCost: true } });
          const soldQuantity = saleMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity), 0);
          const saleCost = saleMovements.reduce((sum, movement) => sum + Math.abs(movement.quantity) * (movement.unitCost || 0), 0);
          const returnUnitCost = soldQuantity > 0 ? saleCost / soldQuantity : 0;
          const current = await tx.stock.findUnique({ where: { warehouseId_variationId: { warehouseId, variationId: source.variationId } } });
          const balanceAfter = (current?.quantity || 0) + item.quantity;
          const averageUnitCost = balanceAfter > 0 ? (((current?.quantity || 0) * (current?.averageUnitCost || 0)) + item.quantity * returnUnitCost) / balanceAfter : 0;
          const stock = await tx.stock.upsert({ where: { warehouseId_variationId: { warehouseId, variationId: source.variationId } }, create: { warehouseId, variationId: source.variationId, quantity: item.quantity, available: item.quantity, averageUnitCost: returnUnitCost, createdBy: userId, updatedBy: userId }, update: { quantity: { increment: item.quantity }, available: { increment: item.quantity }, averageUnitCost, updatedBy: userId } });
          await tx.inventoryTransaction.create({ data: { warehouseId, variationId: source.variationId, type: "RETURN_IN", quantity: item.quantity, balanceAfter: stock.quantity, unitCost: returnUnitCost, referenceType: "RETURN", referenceId: receipt.id, remarks: `Restocked from order ${order.orderNo}; ${description}`, createdBy: userId } });
        }
      }

      const disposalTotal = [...disposalCosts.values()].reduce((sum, value) => sum + value, 0);
      if (disposalTotal > 0) {
        const category = await tx.expenseCategory.upsert({ where: { name: "Inventory Disposal" }, create: { name: "Inventory Disposal", createdBy: userId, updatedBy: userId }, update: {} });
        const expense = await tx.expense.create({ data: { categoryId: category.id, returnReceiptId: receipt.id, amount: Math.round(disposalTotal * 100) / 100, description: `Disposed returned inventory at buy price · Order ${order.orderNo} · ${description}`, expenseDate: new Date(), paymentMethod: "NON_CASH_DISPOSAL", createdBy: userId, updatedBy: userId } });
        await postJournal(tx, { entryDate: expense.expenseDate, description: expense.description, referenceType: "EXPENSE", referenceId: expense.id, createdBy: userId, lines: [{ accountCode: ACCOUNT_CODES.OPERATING_EXPENSE, debit: expense.amount }, { accountCode: ACCOUNT_CODES.INVENTORY, credit: expense.amount }] });
      }

      const allReturned = order.orderItems.every((source) => {
        const oldQty = source.returnItems.reduce((sum, row) => sum + row.quantity, 0);
        const newQty = items.filter((item) => item.orderItemId === source.id).reduce((sum, item) => sum + item.quantity, 0);
        const delivered = source.deliveryItems.reduce((sum, row) => sum + row.quantity, 0);
        return delivered <= oldQty + newQty + 0.00001;
      });
      if (allReturned) await tx.order.update({ where: { id: order.id }, data: { status: reasonType === "DELIVERY_FAIL" ? "FAILED_RETURN_RECEIVED" : "RETURNED" } });
      await tx.orderTimeline.create({ data: { orderId: order.id, orderNo: order.orderNo, status: allReturned ? (reasonType === "DELIVERY_FAIL" ? "FAILED_RETURN_RECEIVED" : "RETURNED") : order.status, title: reasonType === "DELIVERY_FAIL" ? "Failed delivery return received" : "Customer return received", message: `${description} ${items.map((item) => `${orderItems.get(item.orderItemId).sku}: ${item.quantity} (${item.disposition === "RESTOCK" ? "restocked" : "disposed"})`).join("; ")}`, createdBy: userId } });

      // Treat the carrier charge as a delivery failure expense only when it
      // was not prepaid and the customer did not pay it on return.
      const customerPaidCharge = values.customerPaidCharge === "true";
      const charge = Math.max(0, Number(order.deliveryCharge) - Number(order.deliveryDiscount || 0));
      if (reasonType === "DELIVERY_FAIL" && Number(order.paidAmount || 0) <= 0 && !customerPaidCharge && charge > 0) {
        const priorDeliveryExpense = await tx.expense.findFirst({ where: { category: { name: "Delivery Fail" }, returnReceipt: { orderId: order.id }, voidedAt: null }, select: { id: true } });
        if (priorDeliveryExpense) return;
        const accountId = String(values.moneyAccountId || "");
        const account = accountId ? await tx.moneyAccount.findUnique({ where: { id: accountId } }) : null;
        if (!account?.isActive) throw new Error("Select an active account to record the unpaid delivery charge expense.");
        const category = await tx.expenseCategory.upsert({ where: { name: "Delivery Fail" }, create: { name: "Delivery Fail", createdBy: userId, updatedBy: userId }, update: {} });
        const expense = await tx.expense.create({ data: { categoryId: category.id, returnReceiptId: receipt.id, amount: charge, description: `Delivery fail · Order ${order.orderNo} · ${description}`, expenseDate: new Date(), paymentMethod: account.type, moneyAccountId: account.id, createdBy: userId, updatedBy: userId } });
        const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
        await postMoneyTransaction(tx, { transactionNo, type: "EXPENSE", amount: charge, fromAccountId: account.id, expenseId: expense.id, idempotencyKey: `EXPENSE:${expense.id}`, reference: order.orderNo, note: `Delivery fail expense for order ${order.orderNo}`, transactionDate: expense.expenseDate, createdBy: userId });
        await postJournal(tx, { entryDate: expense.expenseDate, description: expense.description, referenceType: "EXPENSE", referenceId: expense.id, createdBy: userId, lines: [{ accountCode: ACCOUNT_CODES.OPERATING_EXPENSE, debit: charge }, { accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", credit: charge }] });
      }
    });
    revalidatePath("/admin/returns");
    revalidatePath("/admin/refunds");
    revalidatePath("/admin/inventory/stock");
    revalidatePath("/admin/accounts/expenses");
    revalidatePath("/admin/orders");
    return { success: true, message: `Returned items received; stock and expense records were updated.${queuedRefundAmount > 0 ? ` ৳${queuedRefundAmount.toFixed(2)} refund added to the refund queue for admin decision.` : ` ${refundQueueNote}`}` };
  } catch (error) { return actionError(error, "Could not receive returned items."); }
}
