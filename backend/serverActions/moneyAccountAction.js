"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { actionError, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { postMoneyTransaction } from "../services/moneyTransactionService";
import { requireCurrentStoreId } from "../services/storeContextService";

const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_FINANCIAL", "PAYMENT_GATEWAY", "COURIER"];
const MOVEMENT_TYPES = ["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL", "SUPPLIER_PAYMENT", "EXPENSE", "REFUND", "PROVIDER_FEE"];
const refresh = () => {
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/accounts/ledger");
  revalidatePath("/admin/accounts/shareholders");
};

export async function getMoneyManagement(params = {}) {
  try {
    await requireProcurementPermission("accounting", "view");
    const storeId = await requireCurrentStoreId();
    const accountPage = Math.max(1, Number(params.accountPage) || 1), transactionPage = Math.max(1, Number(params.transactionPage) || 1), limit = Math.min(50, Math.max(5, Number(params.limit) || 12));
    const accountWhere = {
      storeId,
      ...(params.accountName && { name: { contains: String(params.accountName), mode: "insensitive" } }),
      ...(ACCOUNT_TYPES.includes(params.accountType) && { type: params.accountType }),
      ...(params.accountStatus === "ACTIVE" && { isActive: true }),
      ...(params.accountStatus === "INACTIVE" && { isActive: false }),
    };
    const transactionWhere = {
      storeId,
      ...(params.transactionNo && { transactionNo: { contains: String(params.transactionNo), mode: "insensitive" } }),
      ...(params.reference && { reference: { contains: String(params.reference), mode: "insensitive" } }),
      ...(MOVEMENT_TYPES.includes(params.transactionType) && { type: params.transactionType }),
    };
    const [accounts, accountCount, allAccounts, transactions, transactionCount, shareholders, financialAccounts, balances, periodTransactions] = await Promise.all([
      prisma.moneyAccount.findMany({ where: accountWhere, skip: (accountPage - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { _count: { select: { incomingTransactions: true, outgoingTransactions: true, supplierPayments: true, expenses: true, paymentGateways: true, courierProviders: true, payments: true, refunds: true } } } }),
      prisma.moneyAccount.count({ where: accountWhere }),
      prisma.moneyAccount.findMany({ where: { storeId }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
      prisma.moneyTransaction.findMany({ where: transactionWhere, skip: (transactionPage - 1) * limit, take: limit, orderBy: { transactionDate: "desc" }, include: { fromAccount: true, toAccount: true, shareholder: true } }),
      prisma.moneyTransaction.count({ where: transactionWhere }),
      prisma.shareholder.findMany({ where: { storeId, isActive: true }, orderBy: { name: "asc" } }),
      prisma.financialAccount.findMany({ where: { isActive: true } }),
      prisma.journalLine.groupBy({ by: ["accountId"], where: { journalEntry: { storeId, status: "POSTED" } }, _sum: { debit: true, credit: true } }),
      prisma.moneyTransaction.groupBy({ by: ["type"], where: { storeId }, _sum: { amount: true } }),
    ]);
    const financialMap = new Map(financialAccounts.map((account) => [account.id, account]));
    const totals = { assets: 0, liabilities: 0, equity: 0, income: 0, expenses: 0 };
    balances.forEach((row) => { const account = financialMap.get(row.accountId); if (!account) return; const debit = row._sum.debit || 0, credit = row._sum.credit || 0; const value = ["ASSET", "EXPENSE"].includes(account.type) ? debit - credit : credit - debit; const key = { ASSET: "assets", LIABILITY: "liabilities", EQUITY: "equity", INCOME: "income", EXPENSE: "expenses" }[account.type]; totals[key] += value; });
    const movementTotals = Object.fromEntries(periodTransactions.map((row) => [row.type, row._sum.amount || 0]));
    const typeBalances = allAccounts.reduce((result, account) => ({ ...result, [account.type]: (result[account.type] || 0) + account.balance }), {});
    const report = { ...totals, liquidFunds: allAccounts.reduce((sum, account) => sum + account.balance, 0), activeAccounts: allAccounts.filter((account) => account.isActive).length, deposits: (movementTotals.FUND_ADD || 0) + (movementTotals.CUSTOMER_PAYMENT || 0), withdrawals: movementTotals.WITHDRAWAL || 0, supplierPayments: movementTotals.SUPPLIER_PAYMENT || 0, netProfit: totals.income - totals.expenses, byType: Object.entries(typeBalances).map(([type, balance]) => ({ type, balance })) };
    return { success: true, data: { accounts, allAccounts, transactions, shareholders, report, pagination: { accounts: { page: accountPage, totalPages: Math.max(1, Math.ceil(accountCount / limit)), total: accountCount }, transactions: { page: transactionPage, totalPages: Math.max(1, Math.ceil(transactionCount / limit)), total: transactionCount }, limit } }, filters: params };
  } catch (error) { return actionError(error, "Failed to load money accounts."); }
}

export async function createMoneyAccount(formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    if (!name || !ACCOUNT_TYPES.includes(values.type)) return { success: false, message: "Account name and a valid account type are required." };
    const result = await prisma.moneyAccount.create({ data: { storeId, name, type: values.type, accountNumber: String(values.accountNumber || "").trim() || null, createdBy: userId, updatedBy: userId } });
    refresh();
    return { success: true, message: "Money account created.", data: result };
  } catch (error) { return actionError(error, "Failed to create money account."); }
}

export async function updateMoneyAccount(id, formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "update");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    if (!name || !ACCOUNT_TYPES.includes(values.type)) return { success: false, message: "Account name and a valid account type are required." };
    const result = await prisma.moneyAccount.update({ where: { id, storeId }, data: { name, type: values.type, accountNumber: String(values.accountNumber || "").trim() || null, isActive: values.isActive !== "false", updatedBy: userId } });
    refresh();
    return { success: true, message: "Money account updated.", data: result };
  } catch (error) { return actionError(error, "Failed to update money account."); }
}

export async function createShareholder(formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    const sharePercentage = values.sharePercentage === "" ? null : toNumber(values.sharePercentage, -1);
    if (!name || (sharePercentage !== null && (sharePercentage < 0 || sharePercentage > 100))) return { success: false, message: "Name is required and share percentage must be between 0 and 100." };
    const result = await prisma.shareholder.create({ data: { storeId, name, phone: values.phone || null, email: values.email || null, address: values.address || null, sharePercentage, createdBy: userId, updatedBy: userId } });
    refresh();
    return { success: true, message: "Shareholder added.", data: result };
  } catch (error) { return actionError(error, "Failed to add shareholder."); }
}

export async function updateShareholder(id, formData) {
  try {
    const userId = await requireProcurementPermission("accounting", "update");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const name = String(values.name || "").trim();
    const sharePercentage = values.sharePercentage === "" ? null : toNumber(values.sharePercentage, -1);
    if (!name || (sharePercentage !== null && (sharePercentage < 0 || sharePercentage > 100))) return { success: false, message: "Name is required and share percentage must be between 0 and 100." };
    const result = await prisma.shareholder.update({ where: { id, storeId }, data: { name, phone: String(values.phone || "").trim() || null, email: String(values.email || "").trim() || null, address: String(values.address || "").trim() || null, sharePercentage, isActive: values.isActive === "true", updatedBy: userId } });
    refresh();
    return { success: true, message: "Shareholder updated.", data: result };
  } catch (error) { return actionError(error, "Failed to update shareholder."); }
}

export async function getShareholders(params = {}) {
  try {
    await requireProcurementPermission("accounting", "view");
    const storeId = await requireCurrentStoreId();
    const status = String(params.status || "ALL");
    const where = {
      storeId,
      ...(params.name && { name: { contains: String(params.name), mode: "insensitive" } }),
      ...(params.phone && { phone: { contains: String(params.phone), mode: "insensitive" } }),
      ...(params.email && { email: { contains: String(params.email), mode: "insensitive" } }),
      ...(status === "ACTIVE" && { isActive: true }),
      ...(status === "INACTIVE" && { isActive: false }),
    };
    const page = Math.max(1, Number(params.page) || 1), limit = Math.min(50, Math.max(5, Number(params.limit) || 10));
    const [data, total] = await Promise.all([prisma.shareholder.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: [{ isActive: "desc" }, { name: "asc" }], include: { transactions: { where: { storeId, type: { in: ["FUND_ADD", "WITHDRAWAL"] } }, orderBy: { transactionDate: "desc" }, include: { fromAccount: { select: { name: true, type: true } }, toAccount: { select: { name: true, type: true } } } } } }), prisma.shareholder.count({ where })]);
    return { success: true, data, filters: params, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  } catch (error) { return actionError(error, "Failed to load shareholders."); }
}

export async function recordMoneyMovement(formData) {
  try {
    const userId = await requireProcurementPermission("moneyTransaction", "create", "accounting");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const type = values.type;
    const amount = toNumber(values.amount);
    if (!["FUND_ADD", "CUSTOMER_PAYMENT", "TRANSFER", "WITHDRAWAL"].includes(type) || amount <= 0) return { success: false, message: "A valid movement type and positive amount are required." };
    if (["FUND_ADD", "CUSTOMER_PAYMENT"].includes(type) && !values.toAccountId) return { success: false, message: "Receiving account is required." };
    if (type === "WITHDRAWAL" && !values.fromAccountId) return { success: false, message: "Source account is required." };
    if (type === "WITHDRAWAL" && !values.shareholderId) return { success: false, message: "Select who is withdrawing the cash." };
    if (type === "TRANSFER" && (!values.fromAccountId || !values.toAccountId || values.fromAccountId === values.toAccountId)) return { success: false, message: "Choose two different accounts for a transfer." };

    const result = await prisma.$transaction(async (tx) => {
      if (values.shareholderId) {
        const shareholder = await tx.shareholder.findUnique({ where: { id: values.shareholderId, storeId }, select: { id: true } });
        if (!shareholder) throw new Error("The selected shareholder is unavailable.");
      }
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
    }, { timeout: 30000 });
    refresh();
    return { success: true, message: "Money movement recorded.", data: result };
  } catch (error) { return actionError(error, "Failed to record money movement."); }
}

export async function deleteMoneyAccount(id) {
  try {
    await requireProcurementPermission("accounting", "delete");
    const storeId = await requireCurrentStoreId();
    const account = await prisma.moneyAccount.findUnique({ where: { id, storeId }, select: { id: true } });
    if (!account) return { success: false, message: "Money account not found." };
    const [dependencies, supplierPayments, expenses, gatewayMappings, courierMappings, payments, refunds] = await Promise.all([
      prisma.moneyTransaction.count({ where: { storeId, OR: [{ fromAccountId: id }, { toAccountId: id }] } }),
      prisma.supplierPayment.count({ where: { storeId, moneyAccountId: id } }),
      prisma.expense.count({ where: { storeId, moneyAccountId: id } }),
      prisma.paymentGateway.count({ where: { storeId, moneyAccountId: id } }),
      prisma.courierProvider.count({ where: { storeId, moneyAccountId: id } }),
      prisma.payment.count({ where: { storeId, moneyAccountId: id } }),
      prisma.refund.count({ where: { storeId, moneyAccountId: id } }),
    ]);
    if (dependencies || supplierPayments || expenses || gatewayMappings || courierMappings || payments || refunds) return { success: false, message: "This account is mapped or has financial documents and cannot be deleted." };
    await prisma.moneyAccount.delete({ where: { id, storeId } });
    refresh();
    return { success: true, message: "Money account deleted." };
  } catch (error) { return actionError(error, "Failed to delete money account."); }
}

export async function deleteShareholder(id) {
  try {
    await requireProcurementPermission("accounting", "delete");
    const storeId = await requireCurrentStoreId();
    const shareholder = await prisma.shareholder.findUnique({ where: { id, storeId }, select: { id: true } });
    if (!shareholder) return { success: false, message: "Shareholder not found." };
    const dependencies = await prisma.moneyTransaction.count({ where: { storeId, shareholderId: id } });
    if (dependencies) return { success: false, message: "This shareholder has deposits or withdrawals and cannot be deleted." };
    await prisma.shareholder.delete({ where: { id, storeId } });
    refresh();
    return { success: true, message: "Shareholder deleted." };
  } catch (error) { return actionError(error, "Failed to delete shareholder."); }
}
