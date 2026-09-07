"use server";

import prisma from "@/lib/prisma";
import { actionError, requireProcurementPermission } from "../utils/procurement";

const dateRange = (startDate, endDate) => ({
  ...(startDate && { gte: new Date(`${startDate}T00:00:00`) }),
  ...(endDate && { lte: new Date(`${endDate}T23:59:59.999`) }),
});

export async function getAccountingDashboard(params = {}) {
  try {
    await requireProcurementPermission("accounting", "view");
    const today = new Date();
    const startDate = params.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    const endDate = params.endDate || today.toISOString().slice(0, 10);
    const range = dateRange(startDate, endDate);
    const [accounts, allBalances, periodBalances, recentEntries] = await Promise.all([
      prisma.financialAccount.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
      prisma.journalLine.groupBy({ by: ["accountId"], where: { journalEntry: { status: "POSTED" } }, _sum: { debit: true, credit: true } }),
      prisma.journalLine.groupBy({ by: ["accountId"], where: { journalEntry: { status: "POSTED", entryDate: range } }, _sum: { debit: true, credit: true } }),
      prisma.journalEntry.findMany({ where: { status: "POSTED" }, take: 8, orderBy: { entryDate: "desc" }, include: { lines: { include: { account: true } } } }),
    ]);
    const accountMap = new Map(accounts.map((account) => [account.id, account]));
    const signed = (row) => {
      const account = accountMap.get(row.accountId);
      const debit = row._sum.debit || 0, credit = row._sum.credit || 0;
      return ["ASSET", "EXPENSE"].includes(account?.type) ? debit - credit : credit - debit;
    };
    const sumType = (rows, type) => rows.filter((row) => accountMap.get(row.accountId)?.type === type).reduce((sum, row) => sum + signed(row), 0);
    const balanceByCode = (code) => { const account = accounts.find((row) => row.code === code); const row = allBalances.find((item) => item.accountId === account?.id); return row ? signed(row) : 0; };
    return { success: true, data: { accounts, recentEntries, startDate, endDate, cash: balanceByCode("1000"), bank: balanceByCode("1010"), inventory: balanceByCode("1200"), payable: balanceByCode("2000"), income: sumType(periodBalances, "INCOME"), expenses: sumType(periodBalances, "EXPENSE") } };
  } catch (error) { return actionError(error, "Failed to load accounting dashboard."); }
}

export async function getJournalEntries(params = {}) {
  try {
    await requireProcurementPermission("accounting", "view");
    const page = Math.max(1, Number(params.page) || 1), limit = Math.min(100, Math.max(5, Number(params.limit) || 10));
    const range = dateRange(params.startDate, params.endDate);
    const where = { status: "POSTED", ...((params.startDate || params.endDate) && { entryDate: range }), ...(params.entryNo && { entryNo: { contains: String(params.entryNo), mode: "insensitive" } }), ...(params.description && { description: { contains: String(params.description), mode: "insensitive" } }), ...(params.referenceId && { referenceId: { contains: String(params.referenceId), mode: "insensitive" } }), ...(params.referenceType && params.referenceType !== "ALL" && { referenceType: params.referenceType }) };
    const [data, total] = await Promise.all([
      prisma.journalEntry.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { entryDate: "desc" }, include: { lines: { include: { account: true } } } }),
      prisma.journalEntry.count({ where }),
    ]);
    return { success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, filters: params };
  } catch (error) { return actionError(error, "Failed to load account ledger."); }
}
