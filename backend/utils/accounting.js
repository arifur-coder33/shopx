import { generateCode } from "./generateCode";

export const ACCOUNT_CODES = {
  CASH: "1000",
  BANK: "1010",
  INVENTORY: "1200",
  ACCOUNTS_PAYABLE: "2000",
  SALES: "4000",
  COST_OF_GOODS: "5000",
  OPERATING_EXPENSE: "6000",
  SHARE_CAPITAL: "3000",
  OWNER_WITHDRAWAL: "3100",
  ACCOUNTS_RECEIVABLE: "1100",
  SALES_RETURNS: "4010",
  PROVIDER_FEES: "6010",
};

const defaultAccounts = {
  "1000": ["Cash", "ASSET"],
  "1010": ["Bank", "ASSET"],
  "1200": ["Inventory", "ASSET"],
  "2000": ["Accounts Payable", "LIABILITY"],
  "4000": ["Sales Revenue", "INCOME"],
  "5000": ["Cost of Goods Sold", "EXPENSE"],
  "6000": ["Operating Expenses", "EXPENSE"],
  "3000": ["Share Capital", "EQUITY"],
  "3100": ["Owner Withdrawals", "EQUITY"],
  "1100": ["Accounts Receivable", "ASSET"],
  "4010": ["Sales Returns", "INCOME"],
  "6010": ["Payment and Courier Fees", "EXPENSE"],
};

export async function assertAccountingPeriodOpen(tx, entryDate) {
  const date = entryDate instanceof Date ? entryDate : new Date(entryDate);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid accounting date.");
  const [financialYear, period] = await Promise.all([
    tx.financialYear.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { name: true, isClosed: true },
    }),
    tx.accountingPeriod.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
      select: { name: true, status: true },
    }),
  ]);
  if (financialYear?.isClosed) {
    throw new Error(`Financial year ${financialYear.name} is closed.`);
  }
  if (period?.status === "CLOSED") {
    throw new Error(`Accounting period ${period.name} is closed.`);
  }
  return period;
}

export async function ensureAccount(tx, code, accountName, accountType) {
  const defaults = defaultAccounts[code];
  const name = accountName || defaults?.[0];
  const type = accountType || defaults?.[1];
  if (!name || !type) throw new Error(`Unknown financial account: ${code}`);
  return tx.financialAccount.upsert({
    where: { code },
    update: { name, type, isActive: true },
    create: { code, name, type },
  });
}

export async function postJournal(tx, { entryDate = new Date(), description, referenceType, referenceId, createdBy, lines }) {
  if (referenceId) {
    const existing = await tx.journalEntry.findFirst({ where: { referenceType, referenceId, status: "POSTED" } });
    if (existing) return existing;
  }
  const debit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const credit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  if (debit <= 0 || Math.abs(debit - credit) > 0.001) throw new Error("Journal entry must have equal debit and credit totals.");
  await assertAccountingPeriodOpen(tx, entryDate);
  const accountRows = await Promise.all(lines.map((line) => ensureAccount(tx, line.accountCode, line.accountName, line.accountType)));
  const entryNo = await generateCode(tx, { name: "JOURNAL_ENTRY", prefix: "JV-", padding: 8 });
  return tx.journalEntry.create({
    data: {
      entryNo, entryDate, description, referenceType, referenceId: referenceId || null,
      createdBy, updatedBy: createdBy,
      lines: { create: lines.map((line, index) => ({ accountId: accountRows[index].id, debit: Number(line.debit || 0), credit: Number(line.credit || 0), memo: line.memo || null })) },
    },
  });
}

export const paymentAccountCode = (method) => method === "BANK" ? ACCOUNT_CODES.BANK : ACCOUNT_CODES.CASH;

export const moneyAccountCode = (account) => `11${account.id.slice(-10)}`;
