"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { postMoneyTransaction } from "../services/moneyTransactionService";
import { requireCurrentStoreId } from "../services/storeContextService";

export async function createExpenseCategory(formData) {
  try {
    const userId = await requireProcurementPermission("expense", "create");
    const storeId = await requireCurrentStoreId();
    const name = String(formData.get("name") || "").trim();
    if (!name) return { success: false, message: "Category name is required." };
    const result = await prisma.expenseCategory.create({ data: { storeId, name, createdBy: userId, updatedBy: userId } });
    refreshProcurement();
    return { success: true, message: "Expense category created.", data: result };
  } catch (error) { return actionError(error, "Failed to create expense category."); }
}

export async function createExpense(formData) {
  try {
    const userId = await requireProcurementPermission("expense", "create");
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    if (!values.categoryId || !values.moneyAccountId || amount <= 0) return { success: false, message: "Expense category, source account and a valid amount are required." };
    const result = await prisma.$transaction(async (tx) => {
      const [account, category] = await Promise.all([
        tx.moneyAccount.findUnique({ where: { id: values.moneyAccountId, storeId } }),
        tx.expenseCategory.findUnique({ where: { id: values.categoryId, storeId } }),
      ]);
      if (!account?.isActive) throw new Error("The selected money account is unavailable.");
      if (!category) throw new Error("The selected expense category is unavailable.");
      const expense = await tx.expense.create({ data: { storeId, categoryId: category.id, moneyAccountId: account.id, amount, description: values.description || null, expenseDate: toDate(values.expenseDate), paymentMethod: account.type, createdBy: userId, updatedBy: userId } });
      const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      await postMoneyTransaction(tx, { transactionNo, type: "EXPENSE", amount, fromAccountId: account.id, expenseId: expense.id, idempotencyKey: `EXPENSE:${expense.id}`, reference: String(values.reference || "").trim() || null, note: values.description || "Operating expense", transactionDate: expense.expenseDate, createdBy: userId });
      await postJournal(tx, { entryDate: expense.expenseDate, description: values.description || "Operating expense", referenceType: "EXPENSE", referenceId: expense.id, createdBy: userId, lines: [{ accountCode: ACCOUNT_CODES.OPERATING_EXPENSE, debit: amount }, { accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", credit: amount }] });
      return expense;
    }, { timeout: 30000 });
    refreshProcurement();
    return { success: true, message: "Expense recorded successfully.", data: result };
  } catch (error) { return actionError(error, "Failed to record expense."); }
}
