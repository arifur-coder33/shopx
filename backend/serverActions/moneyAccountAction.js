"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { actionError, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { postMoneyTransaction } from "../services/moneyTransactionService";

const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_FINANCIAL", "PAYMENT_GATEWAY", "COURIER"];
const MOVEMENT_TYPES = ["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL", "SUPPLIER_PAYMENT", "EXPENSE", "REFUND", "PROVIDER_FEE"];
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
      (purchaseOrder.shippingCost + purchaseOrder.expenses.reduce((sum, expense) => sum + expense.amount, 0)) /
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
    const unitCost = weightedUnitCosts.get(`${outflow.warehouseId}:${outflow.variationId}`);
    if (!unitCost) return total;
    return total + Math.abs(outflow.quantity) * unitCost;
  }, 0);
}

function calculateInventoryAsset(stocks, weightedUnitCosts) {
  return stocks.reduce((total, stock) => {
    const unitCost = weightedUnitCosts.get(`${stock.warehouseId}:${stock.variationId}`);
    return total + stock.quantity * (unitCost || 0);
  }, 0);
}

export async function getMoneyManagement(params = {}) {
  try {
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
    };
    const [accounts, accountCount, allAccounts, transactions, transactionCount, shareholders, financialAccounts, balances, periodTransactions, stocks, salesOutflows, receiptItems] = await Promise.all([
      prisma.moneyAccount.findMany({ where: accountWhere, skip: (accountPage - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { incomingTransactions: true, outgoingTransactions: true, supplierPayments: true, expenses: true, paymentGateways: true, courierProviders: true, payments: true, refunds: true } } } }),
      prisma.moneyAccount.count({ where: accountWhere }),
      prisma.moneyAccount.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.moneyTransaction.findMany({ where: transactionWhere, skip: (transactionPage - 1) * limit, take: limit, orderBy: { transactionDate: "desc" }, include: { fromAccount: true, toAccount: true, shareholder: true } }),
      prisma.moneyTransaction.count({ where: transactionWhere }),
      prisma.shareholder.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.financialAccount.findMany({ where: { isActive: true } }),
      prisma.journalLine.groupBy({ by: ["accountId"], where: { journalEntry: { status: "POSTED" } }, _sum: { debit: true, credit: true } }),
      prisma.moneyTransaction.groupBy({ by: ["type"], _sum: { amount: true } }),
      prisma.stock.findMany({ select: { variationId: true, warehouseId: true, quantity: true } }),
      prisma.inventoryTransaction.groupBy({ by: ["variationId", "warehouseId"], where: { type: "OUT", referenceType: "SALE" }, _sum: { quantity: true } }),
      prisma.goodsReceiptItem.findMany({
        where: { goodsReceipt: { isNot: null } },
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
                  expenses: { select: { amount: true } },
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
      salesOutflows.map((row) => ({ ...row, quantity: row._sum.quantity || 0 })),
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
    return { success: true, data: { accounts, allAccounts, transactions, shareholders, report, pagination: { accounts: { page: accountPage, totalPages: Math.max(1, Math.ceil(accountCount / limit)), total: accountCount }, transactions: { page: transactionPage, totalPages: Math.max(1, Math.ceil(transactionCount / limit)), total: transactionCount }, limit } }, filters: params };
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
    const [data, total] = await Promise.all([prisma.shareholder.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { transactions: { where: { type: { in: ["FUND_ADD", "WITHDRAWAL"] } }, orderBy: { transactionDate: "desc" }, include: { fromAccount: { select: { name: true, type: true } }, toAccount: { select: { name: true, type: true } } } } } }), prisma.shareholder.count({ where })]);
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
