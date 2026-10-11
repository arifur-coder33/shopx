"use server";
import prisma from "@/lib/prisma";
import { actionError, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { postMoneyTransaction } from "../services/moneyTransactionService";

export async function createExpenseCategory(formData) {
  try {
    const userId = await requireProcurementPermission("expense", "create");
    const name = String(formData.get("name") || "").trim();
    if (!name) return { success: false, message: "Category name is required." };
    const result = await prisma.expenseCategory.create({ data: { name, createdBy: userId, updatedBy: userId } });
    refreshProcurement();
    return { success: true, message: "Expense category created.", data: result };
  } catch (error) { return actionError(error, "Failed to create expense category."); }
}

export async function createExpense(formData) {
  try {
    const userId = await requireProcurementPermission("expense", "create");
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    if (!values.categoryId || !values.moneyAccountId || amount <= 0) return { success: false, message: "Expense category, source account and a valid amount are required." };
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.moneyAccount.findUnique({ where: { id: values.moneyAccountId } });
      if (!account?.isActive) throw new Error("The selected money account is unavailable.");
      const purchaseOrder = values.purchaseOrderId ? await tx.purchaseOrder.findUnique({ where: { id: values.purchaseOrderId }, select: { id: true, poNo: true } }) : null;
      if (values.purchaseOrderId && !purchaseOrder) throw new Error("The selected purchase order was not found.");
      const expense = await tx.expense.create({ data: { categoryId: values.categoryId, purchaseOrderId: purchaseOrder?.id || null, moneyAccountId: account.id, amount, description: values.description || null, expenseDate: toDate(values.expenseDate), paymentMethod: account.type, createdBy: userId, updatedBy: userId } });
      const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      await postMoneyTransaction(tx, { transactionNo, type: "EXPENSE", amount, fromAccountId: account.id, expenseId: expense.id, idempotencyKey: `EXPENSE:${expense.id}`, reference: String(values.reference || "").trim() || null, note: values.description || "Operating expense", transactionDate: expense.expenseDate, createdBy: userId });
      await postJournal(tx, { entryDate: expense.expenseDate, description: values.description || (purchaseOrder ? `Freight for ${purchaseOrder.poNo}` : "Operating expense"), referenceType: "EXPENSE", referenceId: expense.id, createdBy: userId, lines: [{ accountCode: purchaseOrder ? ACCOUNT_CODES.INVENTORY : ACCOUNT_CODES.OPERATING_EXPENSE, debit: amount }, { accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", credit: amount }] });
      return expense;
    });
    refreshProcurement();
    return { success: true, message: "Expense recorded successfully.", data: result };
  } catch (error) { return actionError(error, "Failed to record expense."); }
}
