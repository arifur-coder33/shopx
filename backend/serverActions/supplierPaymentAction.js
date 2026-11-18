"use server";
import prisma from "@/lib/prisma";
import { ACCOUNT_CODES, moneyAccountCode, postJournal } from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { postMoneyTransaction } from "../services/moneyTransactionService";
import { getPurchaseReceiveSummary } from "../utils/purchaseReceiptValue";
import { actionError, refreshProcurement, requireProcurementPermission, toDate, toNumber } from "../utils/procurement";

export async function createSupplierPayment(formData) {
  try {
    const userId = await requireProcurementPermission("supplierPayment", "create");
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    const paymentType = values.paymentType === "ADVANCE" ? "ADVANCE" : "PO_PAYMENT";
    if (!values.supplierId || (paymentType === "PO_PAYMENT" && !values.purchaseOrderId) || amount <= 0 || !values.moneyAccountId) {
      return { success: false, message: "Supplier, amount, source account and a received PO for regular payment are required." };
    }
    const result = await prisma.$transaction(async (tx) => {
      const poId = paymentType === "PO_PAYMENT" ? values.purchaseOrderId : values.purchaseOrderId || null;
      const po = poId ? await tx.purchaseOrder.findUnique({ where: { id: poId }, include: { items: true, expenses: { where: { voidedAt: null }, select: { amount: true, voidedAt: true } } } }) : null;
      let currentDue = 0;
      if (paymentType === "PO_PAYMENT") {
        if (!po || po.supplierId !== values.supplierId) throw new Error("Purchase order does not belong to this supplier.");
        if (!["PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status)) throw new Error("Regular payment can be posted only after goods are received.");
        currentDue = Math.max(0, getPurchaseReceiveSummary(po).receivedValue - Number(po.paidAmount || 0));
        if (amount > currentDue) throw new Error("Payment exceeds received goods payable. Record an advance separately for goods not received yet.");
      } else {
        const supplier = await tx.supplier.findUnique({ where: { id: values.supplierId }, select: { id: true, isActive: true } });
        if (!supplier?.isActive) throw new Error("Select an active supplier for the advance.");
        if (po && (po.supplierId !== supplier.id || !["PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status))) throw new Error("Choose a received purchase order with a pending supplier payment.");
        if (po) {
          currentDue = Math.max(0, getPurchaseReceiveSummary(po).receivedValue - Number(po.paidAmount || 0));
          if (currentDue <= 0) throw new Error("This purchase order has no pending received-goods payment to tag.");
        }
      }
      const account = await tx.moneyAccount.findUnique({ where: { id: values.moneyAccountId } });
      if (!account?.isActive) throw new Error("The selected money account is unavailable.");
      const paymentReference = values.reference?.trim() || await generateCode(tx, { name: "SUPPLIER_PAYMENT", prefix: "SP-", padding: 7 });
      const payment = await tx.supplierPayment.create({ data: {
        supplierId: values.supplierId, purchaseOrderId: po?.id || null, paymentType,
        moneyAccountId: account.id, amount, paymentMethod: account.type, reference: paymentReference,
        notes: values.notes?.trim() || null, paidAt: toDate(values.paidAt), createdBy: userId, updatedBy: userId,
      } });
      const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      await postMoneyTransaction(tx, {
        transactionNo, type: "SUPPLIER_PAYMENT", amount, fromAccountId: account.id, supplierPaymentId: payment.id,
        idempotencyKey: `SUPPLIER_PAYMENT:${payment.id}`, reference: paymentReference,
        note: paymentType === "ADVANCE" ? `Supplier advance for ${values.supplierId}` : `Supplier payment for ${po.poNo}`,
        transactionDate: payment.paidAt, createdBy: userId,
      });
      await postJournal(tx, {
        entryDate: payment.paidAt,
        description: paymentType === "ADVANCE" ? `Supplier advance from ${account.name}` : `Payment to supplier for ${po.poNo} from ${account.name}`,
        referenceType: "SUPPLIER_PAYMENT", referenceId: payment.id, createdBy: userId,
        lines: [
          { accountCode: paymentType === "ADVANCE" ? ACCOUNT_CODES.SUPPLIER_ADVANCES : ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: amount },
          { accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", credit: amount },
        ],
      });
      if (paymentType === "PO_PAYMENT") {
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { paidAmount: { increment: amount }, dueAmount: Math.max(0, currentDue - amount), updatedBy: userId } });
      }
      if (paymentType === "ADVANCE" && po && currentDue > 0) {
        const appliedAmount = Math.min(amount, currentDue);
        const allocation = await tx.supplierPaymentAllocation.create({ data: { supplierPaymentId: payment.id, purchaseOrderId: po.id, amount: appliedAmount, createdBy: userId } });
        await tx.purchaseOrder.update({ where: { id: po.id }, data: { paidAmount: { increment: appliedAmount }, dueAmount: Math.max(0, currentDue - appliedAmount), updatedBy: userId } });
        await postJournal(tx, {
          description: `Apply supplier advance to ${po.poNo}`, referenceType: "SUPPLIER_ADVANCE_ALLOCATION", referenceId: allocation.id, createdBy: userId,
          lines: [
            { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: appliedAmount },
            { accountCode: ACCOUNT_CODES.SUPPLIER_ADVANCES, credit: appliedAmount },
          ],
        });
      }
      return payment;
    });
    refreshProcurement();
    return { success: true, message: paymentType === "ADVANCE" ? "Supplier advance recorded." : "Supplier payment recorded.", data: result };
  } catch (error) { return actionError(error, "Failed to record supplier payment."); }
}

export async function createSupplierRefund(formData) {
  try {
    const userId = await requireProcurementPermission("supplierPayment", "create");
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    if (!values.supplierId || !values.moneyAccountId || amount <= 0) throw new Error("Supplier, refund amount and destination money account are required.");
    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: values.supplierId, isActive: true }, select: { id: true } });
      if (!supplier) throw new Error("Select an active supplier.");
      const advances = await tx.supplierPayment.findMany({ where: { supplierId: supplier.id, paymentType: "ADVANCE", voidedAt: null }, include: { allocations: true } });
      const availableAdvance = advances.reduce((total, advance) => total + Number(advance.amount) - advance.allocations.reduce((sum, allocation) => sum + Number(allocation.amount), 0), 0);
      if (amount > availableAdvance) throw new Error("Supplier refund cannot exceed the unallocated advance balance.");
      const account = await tx.moneyAccount.findUnique({ where: { id: values.moneyAccountId } });
      if (!account?.isActive) throw new Error("The selected destination account is unavailable.");
      const reference = values.reference?.trim() || await generateCode(tx, { name: "SUPPLIER_REFUND", prefix: "SR-", padding: 7 });
      const refund = await tx.supplierPayment.create({ data: { supplierId: supplier.id, paymentType: "REFUND", moneyAccountId: account.id, amount, paymentMethod: account.type, reference, notes: values.notes?.trim() || null, paidAt: toDate(values.paidAt), createdBy: userId, updatedBy: userId } });
      const transactionNo = await generateCode(tx, { name: "MONEY_TRANSACTION", prefix: "MT-", padding: 8 });
      await postMoneyTransaction(tx, { transactionNo, type: "SUPPLIER_PAYMENT", amount, toAccountId: account.id, supplierPaymentId: refund.id, idempotencyKey: `SUPPLIER_REFUND:${refund.id}`, reference, note: `Supplier advance refund · ${supplier.id}`, transactionDate: refund.paidAt, createdBy: userId });
      await postJournal(tx, { entryDate: refund.paidAt, description: `Supplier advance refund to ${account.name}`, referenceType: "SUPPLIER_PAYMENT", referenceId: refund.id, createdBy: userId, lines: [
        { accountCode: moneyAccountCode(account), accountName: `${account.type} · ${account.name}`, accountType: "ASSET", debit: amount },
        { accountCode: ACCOUNT_CODES.SUPPLIER_ADVANCES, credit: amount },
      ] });
      return refund;
    });
    refreshProcurement();
    return { success: true, message: "Supplier advance refund recorded.", data: result };
  } catch (error) { return actionError(error, "Failed to record supplier refund."); }
}

export async function allocateSupplierAdvance(formData) {
  try {
    const userId = await requireProcurementPermission("supplierPayment", "create");
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    if (!values.paymentId || !values.purchaseOrderId || amount <= 0) throw new Error("Choose an advance and a received purchase order, then enter an allocation amount.");
    await prisma.$transaction(async (tx) => {
      const [advance, po] = await Promise.all([
        tx.supplierPayment.findUnique({ where: { id: values.paymentId }, include: { allocations: true } }),
        tx.purchaseOrder.findUnique({ where: { id: values.purchaseOrderId }, include: { items: true, expenses: { where: { voidedAt: null }, select: { amount: true, voidedAt: true } } } }),
      ]);
      if (!advance || advance.paymentType !== "ADVANCE" || advance.voidedAt) throw new Error("The selected advance is unavailable.");
      if (!po || po.supplierId !== advance.supplierId || !["PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status)) throw new Error("Choose a received PO belonging to the same supplier.");
      const allocated = advance.allocations.reduce((sum, row) => sum + Number(row.amount || 0), 0);
      if (amount > Number(advance.amount) - allocated) throw new Error("Allocation exceeds available supplier advance.");
      const due = Math.max(0, getPurchaseReceiveSummary(po).receivedValue - Number(po.paidAmount || 0));
      if (amount > due) throw new Error("Allocation exceeds the current received goods payable.");
      const allocation = await tx.supplierPaymentAllocation.create({ data: { supplierPaymentId: advance.id, purchaseOrderId: po.id, amount, createdBy: userId } });
      await tx.purchaseOrder.update({ where: { id: po.id }, data: { paidAmount: { increment: amount }, dueAmount: Math.max(0, due - amount), updatedBy: userId } });
      const account = await tx.financialAccount.findUnique({ where: { code: ACCOUNT_CODES.SUPPLIER_ADVANCES } });
      if (!account) throw new Error("Supplier advance account is not configured.");
      await postJournal(tx, {
        description: `Apply supplier advance to ${po.poNo}`, referenceType: "SUPPLIER_ADVANCE_ALLOCATION", referenceId: allocation.id, createdBy: userId,
        lines: [
          { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: amount },
          { accountCode: ACCOUNT_CODES.SUPPLIER_ADVANCES, credit: amount },
        ],
      });
    });
    refreshProcurement();
    return { success: true, message: "Supplier advance allocated to the purchase bill." };
  } catch (error) { return actionError(error, "Failed to allocate supplier advance."); }
}

export async function getSupplierLedger(supplierId, filters = {}) {
  try {
    await requireProcurementPermission("supplierPayment", "view");
    if (!supplierId) throw new Error("Supplier is required.");
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        purchaseOrders: { where: { status: { not: "CANCELLED" } }, include: { items: true, expenses: { where: { voidedAt: null }, select: { amount: true, voidedAt: true } }, receipts: { where: { status: "COMPLETED" }, select: { createdAt: true } } } },
        payments: { where: { voidedAt: null }, orderBy: { paidAt: "asc" }, include: { purchaseOrder: { select: { poNo: true } }, moneyAccount: { select: { name: true, type: true } }, allocations: { include: { purchaseOrder: { select: { poNo: true } } } } } },
      },
    });
    if (!supplier) throw new Error("Supplier not found.");
    const entries = [];
    const opening = Number(supplier.openingBalance || 0);
    if (opening) entries.push({ date: supplier.createdAt, type: "Opening balance", reference: "OPENING", bill: opening, payment: 0, advanceChange: 0 });
    for (const po of supplier.purchaseOrders) {
      const summary = getPurchaseReceiveSummary(po);
      if (!summary.receivedValue) continue;
      const date = po.receipts.reduce((latest, receipt) => !latest || receipt.createdAt > latest ? receipt.createdAt : latest, null) || po.createdAt;
      entries.push({ date, type: "Purchase bill", reference: po.poNo, bill: summary.receivedValue, payment: 0, advanceChange: 0 });
    }
    for (const payment of supplier.payments) {
      if (payment.paymentType === "ADVANCE") {
        entries.push({ date: payment.paidAt, type: "Supplier advance", reference: `${payment.purchaseOrder?.poNo ? `PO ${payment.purchaseOrder.poNo} · ` : ""}${payment.reference || "—"}`, bill: 0, payment: 0, advanceChange: Number(payment.amount) });
        for (const allocation of payment.allocations) entries.push({ date: allocation.allocatedAt, type: "Advance adjusted", reference: `${payment.reference || "Advance"} → ${allocation.purchaseOrder.poNo}`, bill: 0, payment: Number(allocation.amount), advanceChange: -Number(allocation.amount) });
      } else if (payment.paymentType === "REFUND") {
        entries.push({ date: payment.paidAt, type: "Supplier refund", reference: payment.reference || "—", bill: 0, payment: 0, advanceChange: -Number(payment.amount) });
      } else {
        entries.push({ date: payment.paidAt, type: "Supplier payment", reference: `${payment.purchaseOrder?.poNo || "—"} · ${payment.reference || "—"}`, bill: 0, payment: Number(payment.amount), advanceChange: 0 });
      }
    }
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    let currentDue = 0;
    let availableAdvance = 0;
    const ledger = entries.map((entry) => {
      currentDue += entry.bill - entry.payment;
      availableAdvance += entry.advanceChange;
      return { ...entry, currentDue: Math.max(0, currentDue), availableAdvance: Math.max(0, availableAdvance) };
    });
    const fromDate = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const toDate = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;
    const type = String(filters.type || "ALL");
    const search = String(filters.search || "").trim().toLocaleLowerCase();
    const filteredEntries = ledger.filter((entry) => {
      const entryDate = new Date(entry.date);
      if (fromDate && !Number.isNaN(fromDate.getTime()) && entryDate < fromDate) return false;
      if (toDate && !Number.isNaN(toDate.getTime()) && entryDate > toDate) return false;
      if (type !== "ALL" && entry.type !== type) return false;
      if (search && !entry.reference.toLocaleLowerCase().includes(search) && !entry.type.toLocaleLowerCase().includes(search)) return false;
      return true;
    });
    filteredEntries.sort((a, b) => filters.sort === "oldest" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date));
    return { success: true, data: { supplier: { id: supplier.id, companyName: supplier.companyName, openingBalance: opening }, entries: filteredEntries, filters: { from: filters.from || "", to: filters.to || "", type, search: filters.search || "", sort: filters.sort === "oldest" ? "oldest" : "newest" }, currentDue: Math.max(0, currentDue), creditBalance: Math.max(0, -currentDue), availableAdvance: Math.max(0, availableAdvance), netDue: currentDue - availableAdvance } };
  } catch (error) { return actionError(error, "Failed to load supplier ledger."); }
}
