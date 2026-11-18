"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { actionError, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { postMoneyTransaction } from "../services/moneyTransactionService";

const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_FINANCIAL", "PAYMENT_GATEWAY", "COURIER"];
const MOVEMENT_TYPES = ["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL", "SUPPLIER_PAYMENT", "EXPENSE", "REFUND", "PROVIDER_FEE", "REVERSAL"];
const refresh = () => {
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/ledger");
  revalidatePath("/admin/accounts/shareholders");
};

function getWeightedUnitCostByStock(receiptItems) {
  const receivedCostByStock = new Map();
  for (const receiptItem of receiptItems) {
    const receipt = receiptItem.goodsReceipt;
    const purchaseOrder = receipt?.purchaseOrder;
    if (!receipt || !purchaseOrder) continue;

    const orderedQuantity = purchaseOrder.items.reduce((sum, item) => sum + item.quantity, 0);
    const matchingItems = purchaseOrder.items.filter((item) => item.variationId === receiptItem.variationId);
    const matchingQuantity = matchingItems.reduce((sum, item) => sum + item.quantity, 0);
    if (orderedQuantity <= 0 || matchingQuantity <= 0) continue;

    const itemCost = matchingItems.reduce((sum, item) => {
      const discountPerUnit = item.quantity > 0 ? item.discount / item.quantity : 0;
      return sum + Math.max(0, item.unitCost - discountPerUnit) * item.quantity;
    }, 0) / matchingQuantity;
    const landedFreightPerUnit =
      (purchaseOrder.shippingCost + purchaseOrder.expenses.filter((expense) => !expense.voidedAt).reduce((sum, expense) => sum + expense.amount, 0)) /
      orderedQuantity;
    const unitCost = itemCost + landedFreightPerUnit;
    const key = `${receipt.warehouseId}:${receiptItem.variationId}`;
    const current = receivedCostByStock.get(key) || { quantity: 0, cost: 0 };
    current.quantity += receiptItem.quantity;
    current.cost += receiptItem.quantity * unitCost;
    receivedCostByStock.set(key, current);
  }

  return new Map(
    [...receivedCostByStock].map(([key, value]) => [
      key,
      value.quantity > 0 ? value.cost / value.quantity : 0,
    ]),
  );
}

function calculateCostOfGoodsSold(salesOutflows, weightedUnitCosts) {
  return salesOutflows.reduce((total, outflow) => {
    const unitCost = outflow.unitCost ?? weightedUnitCosts.get(`${outflow.warehouseId}:${outflow.variationId}`);
    if (!unitCost) return total;
    return total + Math.abs(outflow.quantity) * unitCost;
  }, 0);
}

function calculateInventoryAsset(stocks, weightedUnitCosts) {
  return stocks.reduce((total, stock) => {
    const unitCost = stock.averageUnitCost ?? weightedUnitCosts.get(`${stock.warehouseId}:${stock.variationId}`);
    return total + stock.quantity * (unitCost || 0);
  }, 0);
}

export async function getMoneyManagement(params = {}) {
  try {
    const session = await auth();
    await requireProcurementPermission("accounting", "view");
    const accountPage = Math.max(1, Number(params.accountPage) || 1), transactionPage = Math.max(1, Number(params.transactionPage) || 1), limit = Math.min(50, Math.max(5, Number(params.limit) || 12));
    const accountWhere = {
      ...(params.accountName && { name: { contains: String(params.accountName), mode: "insensitive" } }),
      ...(ACCOUNT_TYPES.includes(params.accountType) && { type: params.accountType }),
      ...(params.accountStatus === "ACTIVE" && { isActive: true }),
      ...(params.accountStatus === "INACTIVE" && { isActive: false }),
    };
    const transactionWhere = {
      ...(params.transactionNo && { transactionNo: { contains: String(params.transactionNo), mode: "insensitive" } }),
      ...(params.reference && { reference: { contains: String(params.reference), mode: "insensitive" } }),
      ...(MOVEMENT_TYPES.includes(params.transactionType) && { type: params.transactionType }),
      ...(params.transactionStatus === "POSTED" && { status: "POSTED" }),
      ...(params.transactionStatus === "DELETED" && { status: "DELETED" }),
    };
    const [accounts, accountCount, allAccounts, transactions, transactionCount, shareholders, financialAccounts, balances, periodTransactions, stocks, salesOutflows, receiptItems] = await Promise.all([
      prisma.moneyAccount.findMany({ where: accountWhere, skip: (accountPage - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { incomingTransactions: true, outgoingTransactions: true, supplierPayments: true, expenses: true, paymentGateways: true, courierProviders: true, payments: true, refunds: true } } } }),
      prisma.moneyAccount.count({ where: accountWhere }),
      prisma.moneyAccount.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.moneyTransaction.findMany({ where: transactionWhere, skip: (transactionPage - 1) * limit, take: limit, orderBy: { transactionDate: "desc" }, include: { fromAccount: true, toAccount: true, shareholder: true, reversal: { select: { id: true, transactionNo: true } }, reversalOf: { select: { id: true, transactionNo: true } } } }),
      prisma.moneyTransaction.count({ where: transactionWhere }),
      prisma.shareholder.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.financialAccount.findMany({ where: { isActive: true } }),
      prisma.journalLine.groupBy({ by: ["accountId"], where: { journalEntry: { status: "POSTED" } }, _sum: { debit: true, credit: true } }),
      prisma.moneyTransaction.groupBy({ by: ["type"], where: { status: "POSTED", isReversal: false }, _sum: { amount: true } }),
      prisma.stock.findMany({ select: { variationId: true, warehouseId: true, quantity: true, averageUnitCost: true } }),
      prisma.inventoryTransaction.findMany({ where: { type: "OUT", referenceType: "SALE" }, select: { variationId: true, warehouseId: true, quantity: true, unitCost: true } }),
      prisma.goodsReceiptItem.findMany({
        where: { goodsReceipt: { is: { status: "COMPLETED" } } },
        select: {
          variationId: true,
          quantity: true,
          goodsReceipt: {
            select: {
              warehouseId: true,
              purchaseOrder: {
                select: {
                  shippingCost: true,
                  items: { select: { variationId: true, quantity: true, unitCost: true, discount: true } },
                  expenses: { where: { voidedAt: null }, select: { amount: true } },
                },
              },
            },
          },
        },
      }),
    ]);
    const financialMap = new Map(financialAccounts.map((account) => [account.id, account]));
    const totals = { assets: 0, liabilities: 0, equity: 0, income: 0, expenses: 0 };
    balances.forEach((row) => { const account = financialMap.get(row.accountId); if (!account) return; const debit = row._sum.debit || 0, credit = row._sum.credit || 0; const value = ["ASSET", "EXPENSE"].includes(account.type) ? debit - credit : credit - debit; const key = { ASSET: "assets", LIABILITY: "liabilities", EQUITY: "equity", INCOME: "income", EXPENSE: "expenses" }[account.type]; totals[key] += value; });
    const movementTotals = Object.fromEntries(periodTransactions.map((row) => [row.type, row._sum.amount || 0]));
    const typeBalances = allAccounts.reduce((result, account) => ({ ...result, [account.type]: (result[account.type] || 0) + account.balance }), {});
    const weightedUnitCosts = getWeightedUnitCostByStock(receiptItems);
    const costOfGoodsSold = calculateCostOfGoodsSold(
      salesOutflows,
      weightedUnitCosts,
    );
    const inventoryAccount = financialAccounts.find((account) => account.code === "1200");
    const inventoryBalance = balances.find((row) => row.accountId === inventoryAccount?.id);
    const ledgerInventoryAsset = inventoryBalance
      ? (inventoryBalance._sum.debit || 0) - (inventoryBalance._sum.credit || 0)
      : 0;
    const inventoryAsset = calculateInventoryAsset(stocks, weightedUnitCosts);
    const totalAssets = totals.assets - ledgerInventoryAsset + inventoryAsset;
    const report = { ...totals, assets: totalAssets, costOfGoodsSold, grossProfit: totals.income - costOfGoodsSold, inventoryAsset, inventoryQuantity: stocks.reduce((sum, stock) => sum + stock.quantity, 0), liquidFunds: allAccounts.reduce((sum, account) => sum + account.balance, 0), activeAccounts: allAccounts.filter((account) => account.isActive).length, deposits: (movementTotals.FUND_ADD || 0) + (movementTotals.CUSTOMER_PAYMENT || 0), withdrawals: movementTotals.WITHDRAWAL || 0, supplierPayments: movementTotals.SUPPLIER_PAYMENT || 0, netProfit: totals.income - costOfGoodsSold - totals.expenses, byType: Object.entries(typeBalances).map(([type, balance]) => ({ type, balance })) };
    return { success: true, data: { accounts, allAccounts, transactions, shareholders, report, isSuperAdmin: session?.user?.role === "SUPER_ADMIN", pagination: { accounts: { page: accountPage, totalPages: Math.max(1, Math.ceil(accountCount / limit)), total: accountCount }, transactions: { page: transactionPage, totalPages: Math.max(1, Math.ceil(transactionCount / limit)), total: transactionCount }, limit } }, filters: params };
  } catch (error) { return actionError(error, "Failed to load money accounts."); }
}

export async function createMoneyAccount(formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "create");
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    if (!name || !ACCOUNT_TYPES.includes(values.type)) return { success: false, message: "Account name and a valid account type are required." };
    const result = await prisma.moneyAccount.create({ data: { name, type: values.type, accountNumber: String(values.accountNumber || "").trim() || null, createdBy: userId, updatedBy: userId } });
    refresh();
    return { success: true, message: "Money account created.", data: result };
  } catch (error) { return actionError(error, "Failed to create money account."); }
}

export async function updateMoneyAccount(id, formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "update");
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    if (!name || !ACCOUNT_TYPES.includes(values.type)) return { success: false, message: "Account name and a valid account type are required." };
    const result = await prisma.moneyAccount.update({ where: { id }, data: { name, type: values.type, accountNumber: String(values.accountNumber || "").trim() || null, isActive: values.isActive !== "false", updatedBy: userId } });
    refresh();
    return { success: true, message: "Money account updated.", data: result };
  } catch (error) { return actionError(error, "Failed to update money account."); }
}

export async function createShareholder(formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "create");
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    const sharePercentage = values.sharePercentage === "" ? null : toNumber(values.sharePercentage, -1);
    if (!name || (sharePercentage !== null && (sharePercentage < 0 || sharePercentage > 100))) return { success: false, message: "Name is required and share percentage must be between 0 and 100." };
    const result = await prisma.shareholder.create({ data: { name, phone: values.phone || null, email: values.email || null, address: values.address || null, sharePercentage, createdBy: userId, updatedBy: userId } });
    refresh();
    return { success: true, message: "Shareholder added.", data: result };
  } catch (error) { return actionError(error, "Failed to add shareholder."); }
}

export async function updateShareholder(id, formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "update");
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    const sharePercentage = values.sharePercentage === "" ? null : toNumber(values.sharePercentage, -1);
    if (!name || (sharePercentage !== null && (sharePercentage < 0 || sharePercentage > 100))) return { success: false, message: "Name is required and share percentage must be between 0 and 100." };
    const result = await prisma.shareholder.update({ where: { id }, data: { name, phone: String(values.phone || "").trim() || null, email: String(values.email || "").trim() || null, address: String(values.address || "").trim() || null, sharePercentage, isActive: values.isActive === "true", updatedBy: userId } });
    refresh();
    return { success: true, message: "Shareholder updated.", data: result };
  } catch (error) { return actionError(error, "Failed to update shareholder."); }
}

export async function getShareholders(params = {}) {
  try {
    await requireProcurementPermission("accounting", "view");
    const status = String(params.status || "ALL");
    const where = {
      ...(params.name && { name: { contains: String(params.name), mode: "insensitive" } }),
      ...(params.phone && { phone: { contains: String(params.phone), mode: "insensitive" } }),
      ...(params.email && { email: { contains: String(params.email), mode: "insensitive" } }),
      ...(status === "ACTIVE" && { isActive: true }),
      ...(status === "INACTIVE" && { isActive: false }),
    };
    const page = Math.max(1, Number(params.page) || 1), limit = Math.min(50, Math.max(5, Number(params.limit) || 10));
    const [data, total] = await Promise.all([prisma.shareholder.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { transactions: { where: { status: "POSTED", isReversal: false, type: { in: ["FUND_ADD", "WITHDRAWAL"] } }, orderBy: { transactionDate: "desc" }, include: { fromAccount: { select: { name: true, type: true } }, toAccount: { select: { name: true, type: true } } } } } }), prisma.shareholder.count({ where })]);
    return { success: true, data, filters: params, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  } catch (error) { return actionError(error, "Failed to load shareholders."); }
}

export async function recordMoneyMovement(formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "create");
    const values = Object.fromEntries(formData.entries());
    const type = values.type;
    const amount = toNumber(values.amount);
    if (!["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL"].includes(type) || amount <= 0) return { success: false, message: "A valid movement type and positive amount are required." };
    if (["FUND_ADD", "CUSTOMER_PAYMENT"].includes(type) && !values.toAccountId) return { success: false, message: "Receiving account is required." };
    if (type === "WITHDRAWAL" && !values.fromAccountId) return { success: false, message: "Source account is required." };
    if (type === "WITHDRAWAL" && !values.shareholderId) return { success: false, message: "Select who is withdrawing the cash." };
    if (type === "TRANSFER" && (!values.fromAccountId || !values.toAccountId || values.fromAccountId === values.toAccountId)) return { success: false, message: "Choose two different accounts for a transfer." };

    const result = await prisma.$transaction(async (tx) => {
      const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      const posted = await postMoneyTransaction(tx, { transactionNo, type, amount, fromAccountId: values.fromAccountId || null, toAccountId: values.toAccountId || null, shareholderId: values.shareholderId || null, reference: String(values.reference || "").trim() || null, note: String(values.note || "").trim() || null, transactionDate: toDate(values.transactionDate), createdBy: userId });
      const movement = posted.transaction;
      const from = movement.fromAccount;
      const to = movement.toAccount;
      const assetLine = (account, side) => ({ accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", [side]: amount });
      let lines;
      let referenceType;
      if (type === "TRANSFER") { lines = [assetLine(to, "debit"), assetLine(from, "credit")]; referenceType = "ACCOUNT_TRANSFER"; }
      else if (type === "WITHDRAWAL") { lines = [{ accountCode: ACCOUNT_CODES.OWNER_WITHDRAWAL, debit: amount }, assetLine(from, "credit")]; referenceType = "WITHDRAWAL"; }
      else { lines = [assetLine(to, "debit"), { accountCode: type === "CUSTOMER_PAYMENT" ? ACCOUNT_CODES.SALES : ACCOUNT_CODES.SHARE_CAPITAL, credit: amount }]; referenceType = type === "CUSTOMER_PAYMENT" ? "CUSTOMER_PAYMENT" : "FUND_ADD"; }
      await postJournal(tx, { entryDate: movement.transactionDate, description: values.note || `${type.replaceAll("_", " ")} ${transactionNo}`, referenceType, referenceId: movement.id, createdBy: userId, lines });
      return movement;
    });
    refresh();
    return { success: true, message: "Money movement recorded.", data: result };
  } catch (error) { return actionError(error, "Failed to record money movement."); }
}

export async function deleteMoneyAccount(id) {
  try {
    await requireProcurementPermission("accounting", "delete");
    const [dependencies, supplierPayments, expenses, gatewayMappings, courierMappings, payments, refunds] = await Promise.all([
      prisma.moneyTransaction.count({ where: { OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
      prisma.supplierPayment.count({ where: { moneyAccountId: id } }),
      prisma.expense.count({ where: { moneyAccountId: id } }),
      prisma.paymentGateway.count({ where: { moneyAccountId: id } }),
      prisma.courierProvider.count({ where: { moneyAccountId: id } }),
      prisma.payment.count({ where: { moneyAccountId: id } }),
      prisma.refund.count({ where: { moneyAccountId: id } }),
    ]);
    if (dependencies || supplierPayments || expenses || gatewayMappings || courierMappings || payments || refunds) return { success: false, message: "This account is mapped or has financial documents and cannot be deleted." };
    await prisma.moneyAccount.delete({ where: { id } });
    refresh();
    return { success: true, message: "Money account deleted." };
  } catch (error) { return actionError(error, "Failed to delete money account."); }
}

export async function deleteShareholder(id) {
  try {
    await requireProcurementPermission("accounting", "delete");
    const dependencies = await prisma.moneyTransaction.count({ where: { shareholderId: id } });
    if (dependencies) return { success: false, message: "This shareholder has deposits or withdrawals and cannot be deleted." };
    await prisma.shareholder.delete({ where: { id } });
    refresh();
    return { success: true, message: "Shareholder deleted." };
  } catch (error) { return actionError(error, "Failed to delete shareholder."); }
}

async function refreshOrderPaymentTotals(tx, orderId) {
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  const [paid, refunded] = await Promise.all([
    tx.payment.aggregate({
      where: { orderId, status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
      _sum: { amount: true },
    }),
    tx.refund.aggregate({ where: { orderId, status: "COMPLETED" }, _sum: { amount: true } }),
  ]);
  const grossPaid = Number(paid._sum.amount || 0);
  const refundedAmount = Number(refunded._sum.amount || 0);
  const total = Number(order.orderPrice) + Number(order.deliveryCharge) + Number(order.taxAmount || 0) - Number(order.adminDiscount || 0);
  const dueAmount = Math.max(0, Math.round((total - grossPaid) * 100) / 100);
  const netPaid = Math.max(0, Math.round((grossPaid - refundedAmount) * 100) / 100);
  await tx.order.update({
    where: { id: orderId },
    data: {
      paidAmount: netPaid,
      dueAmount,
      paymentStatus: refundedAmount >= grossPaid && grossPaid > 0
        ? "REFUNDED"
        : refundedAmount > 0
          ? "PARTIALLY_REFUNDED"
          : dueAmount <= 0
            ? "PAID"
            : grossPaid > 0
              ? "PARTIALLY_PAID"
              : "UNPAID",
    },
  });
}

/** Soft-delete a posted money transaction and atomically post its financial reversal. */
export async function deleteMoneyTransaction(formData) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPER_ADMIN") {
      throw new Error("Only a Super Admin can reverse money transactions.");
    }
    const userId = session.user.id;
    const transactionId = String(formData.get("transactionId") || "").trim();
    const reason = String(formData.get("reason") || "").trim().slice(0, 1000);
    if (!transactionId) throw new Error("Transaction ID is required.");
    if (reason.length < 5) throw new Error("Please enter a clear reason (at least 5 characters).");

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.moneyTransaction.findUnique({
        where: { id: transactionId },
        include: {
          reversal: { select: { id: true } },
          expense: true,
          supplierPayment: { include: { purchaseOrder: true, allocations: true } },
          payment: { include: { order: true } },
          refund: { include: { payment: { include: { order: true } }, order: true } },
        },
      });
      if (!transaction) throw new Error("Money transaction not found.");
      if (transaction.status !== "POSTED") throw new Error("This transaction has already been deleted or reversed.");
      if (transaction.isReversal || transaction.type === "REVERSAL") throw new Error("A reversal record cannot be deleted.");
      if (transaction.reversal) throw new Error("A reversal already exists for this transaction.");

      const now = new Date();
      const amount = Number(transaction.amount);
      let affectedOrderId = null;

      if (["EXPENSE", "PROVIDER_FEE"].includes(transaction.type) && transaction.expense && !transaction.expense.voidedAt) {
        await tx.expense.update({ where: { id: transaction.expense.id }, data: { voidedAt: now, voidedBy: userId, voidReason: reason, updatedBy: userId } });
      }

      if (transaction.type === "SUPPLIER_PAYMENT" && transaction.supplierPayment && !transaction.supplierPayment.voidedAt) {
        const payment = transaction.supplierPayment;
        if (payment.paymentType === "ADVANCE" && payment.allocations.length) throw new Error("Unapply this supplier advance from its purchase bills before reversing the cash payment.");
        const purchaseOrder = payment.purchaseOrder;
        if (purchaseOrder) {
          if (Number(purchaseOrder.paidAmount) + 0.001 < amount) throw new Error("The purchase order paid balance no longer matches this payment; review it before reversing.");
          await tx.purchaseOrder.update({
            where: { id: purchaseOrder.id },
            data: { paidAmount: { decrement: amount }, dueAmount: { increment: amount }, updatedBy: userId },
          });
        }
        await tx.supplierPayment.update({ where: { id: payment.id }, data: { voidedAt: now, voidedBy: userId, voidReason: reason, updatedBy: userId } });
      }

      if (transaction.type === "CUSTOMER_PAYMENT" && transaction.payment) {
        const payment = transaction.payment;
        if (["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(payment.status)) {
          const completedRefunds = await tx.refund.count({ where: { paymentId: payment.id, status: "COMPLETED" } });
          if (completedRefunds) throw new Error("Reverse completed refunds for this payment first, then reverse the payment.");
          await tx.payment.update({ where: { id: payment.id }, data: { status: "CANCELLED" } });
          await tx.ledger.create({ data: { orderId: payment.orderId, paymentId: payment.id, amount, type: "ADJUSTMENT", direction: "DEBIT", description: `Payment reversed: ${reason}`, reference: transaction.transactionNo, createdBy: userId } });
          affectedOrderId = payment.orderId;
        }
      }

      if (transaction.type === "REFUND" && transaction.refund) {
        const refund = transaction.refund;
        if (refund.status !== "COMPLETED") throw new Error("Only a completed refund with a posted transaction can be reversed.");
        await tx.refund.update({ where: { id: refund.id }, data: { status: "CANCELLED", adminNote: [refund.adminNote, `Voided by Super Admin: ${reason}`].filter(Boolean).join("\n") } });
        if (refund.paymentId && refund.payment) {
          const remainingRefunds = await tx.refund.aggregate({ where: { paymentId: refund.paymentId, status: "COMPLETED" }, _sum: { amount: true } });
          const refundedAmount = Number(remainingRefunds._sum.amount || 0);
          const paymentAmount = Number(refund.payment.amount);
          await tx.payment.update({
            where: { id: refund.paymentId },
            data: { status: refundedAmount >= paymentAmount ? "REFUNDED" : refundedAmount > 0 ? "PARTIALLY_REFUNDED" : "PAID" },
          });
        }
        affectedOrderId = refund.orderId;
        await tx.ledger.create({ data: { orderId: refund.orderId, paymentId: refund.paymentId, amount, type: "ADJUSTMENT", direction: "CREDIT", description: `Refund reversal: ${reason}`, reference: transaction.transactionNo, createdBy: userId } });
      }

      if (affectedOrderId) await refreshOrderPaymentTotals(tx, affectedOrderId);

      const referenceIds = transaction.type === "REFUND"
        ? [transaction.refundId]
        : transaction.type === "CUSTOMER_PAYMENT"
          ? [transaction.paymentId || transaction.id]
          : transaction.type === "SUPPLIER_PAYMENT"
            ? [transaction.supplierPaymentId || transaction.id]
            : [transaction.expenseId || transaction.id];
      const journals = await tx.journalEntry.findMany({
        where: { status: "POSTED", referenceId: { in: referenceIds.filter(Boolean) } },
        include: { lines: { include: { account: true } } },
      });
      const reversalLines = journals.flatMap((entry) => entry.lines.map((line) => ({
        accountCode: line.account.code,
        accountName: line.account.name,
        accountType: line.account.type,
        debit: Number(line.credit),
        credit: Number(line.debit),
        memo: `Reversal of ${entry.entryNo}`,
      })));
      if (reversalLines.length) {
        await postJournal(tx, {
          entryDate: now,
          description: `Reversal of ${transaction.transactionNo}: ${reason}`,
          referenceType: "ADJUSTMENT",
          referenceId: transaction.id,
          createdBy: userId,
          lines: reversalLines,
        });
      }

      // Undo the original account effects. Reversals may take a balance below zero
      // when the original funds have since been spent; that shortfall remains visible.
      if (transaction.toAccountId) {
        await tx.moneyAccount.update({ where: { id: transaction.toAccountId }, data: { balance: { decrement: amount }, updatedBy: userId } });
      }
      if (transaction.fromAccountId) {
        await tx.moneyAccount.update({ where: { id: transaction.fromAccountId }, data: { balance: { increment: amount }, updatedBy: userId } });
      }

      const reversalNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      await tx.moneyTransaction.create({
        data: {
          transactionNo: reversalNo,
          type: "REVERSAL",
          amount,
          fromAccountId: transaction.toAccountId,
          toAccountId: transaction.fromAccountId,
          reference: transaction.transactionNo,
          note: `Reversal of ${transaction.transactionNo}: ${reason}`,
          transactionDate: now,
          createdBy: userId,
          isReversal: true,
          reversalOfId: transaction.id,
        },
      });
      const updated = await tx.moneyTransaction.updateMany({
        where: { id: transaction.id, status: "POSTED" },
        data: { status: "DELETED", deletedAt: now, deletedBy: userId, deleteReason: reason },
      });
      if (updated.count !== 1) throw new Error("Another admin already changed this transaction. Refresh and try again.");
      return { transactionNo: transaction.transactionNo, reversalNo };
    });

    refresh();
    revalidatePath("/admin/accounts/expenses");
    revalidatePath("/admin/accounts/payments");
    revalidatePath("/admin/procurement/purchases");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/refunds");
    return { success: true, message: `${result.transactionNo} soft-deleted; reversal ${result.reversalNo} posted.` };
  } catch (error) {
    if (error?.code === "P2002") return { success: false, message: "A reversal already exists for this transaction. Refresh the page to see its updated status." };
    return actionError(error, "Failed to reverse money transaction.");
  }
}
