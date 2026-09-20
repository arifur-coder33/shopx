"use server";
import prisma from "@/lib/prisma";
import {
  ACCOUNT_CODES,
  moneyAccountCode,
  postJournal,
} from "../utils/accounting";
import { generateCode } from "../utils/generateCode";
import { postMoneyTransaction } from "../services/moneyTransactionService";
import { requireCurrentStoreId } from "../services/storeContextService";
import {
  actionError,
  refreshProcurement,
  requireProcurementPermission,
  toDate,
  toNumber,
} from "../utils/procurement";

export async function createSupplierPayment(formData) {
  try {
    const userId = await requireProcurementPermission(
      "supplierPayment",
      "create",
    );
    const storeId = await requireCurrentStoreId();
    const values = Object.fromEntries(formData.entries());
    const amount = toNumber(values.amount);
    if (
      !values.supplierId ||
      !values.purchaseOrderId ||
      amount <= 0 ||
      !values.moneyAccountId
    )
      return {
        success: false,
        message:
          "Received purchase order, amount and source money account are required.",
      };
    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: values.purchaseOrderId, storeId },
      });
      if (!po || po.supplierId !== values.supplierId)
        throw new Error("Purchase order does not belong to this supplier.");
      if (!["PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status))
        throw new Error("Payment can be posted only after goods are received.");
      if (amount > po.dueAmount)
        throw new Error("Payment exceeds purchase order due amount.");
      const account = await tx.moneyAccount.findUnique({
        where: { id: values.moneyAccountId, storeId },
      });
      if (!account?.isActive)
        throw new Error("The selected money account is unavailable.");
      const paymentReference =
        values.reference?.trim() ||
        (await generateCode(tx, {
          name: "SUPPLIER_PAYMENT",
          prefix: "SP-",
          padding: 7,
        }));
      await tx.purchaseOrder.update({
        where: { id: po.id, storeId },
        data: {
          paidAmount: { increment: amount },
          dueAmount: { decrement: amount },
          updatedBy: userId,
        },
      });
      const payment = await tx.supplierPayment.create({
        data: {
          storeId,
          supplierId: values.supplierId,
          purchaseOrderId: po.id,
          moneyAccountId: account.id,
          amount,
          paymentMethod: account.type,
          reference: paymentReference,
          paidAt: toDate(values.paidAt),
          createdBy: userId,
          updatedBy: userId,
        },
      });
      const transactionNo = await generateCode(tx, {
        name: "MONEY_TRANSACTION",
        prefix: "MT-",
        padding: 8,
      });
      await postMoneyTransaction(tx, {
        transactionNo,
        type: "SUPPLIER_PAYMENT",
        amount,
        fromAccountId: account.id,
        supplierPaymentId: payment.id,
        idempotencyKey: `SUPPLIER_PAYMENT:${payment.id}`,
        reference: paymentReference,
        note: `Supplier payment for ${po.poNo}`,
        transactionDate: payment.paidAt,
        createdBy: userId,
      });
      await postJournal(tx, {
        entryDate: payment.paidAt,
        description: `Payment to supplier for ${po.poNo} from ${account.name}`,
        referenceType: "SUPPLIER_PAYMENT",
        referenceId: payment.id,
        createdBy: userId,
        lines: [
          { accountCode: ACCOUNT_CODES.ACCOUNTS_PAYABLE, debit: amount },
          {
            accountCode: moneyAccountCode(account),
            accountName: `${account.type} · ${account.name}`,
            accountType: "ASSET",
            credit: amount,
          },
        ],
      });
      return payment;
    }, { timeout: 30000 });
    refreshProcurement();
    return {
      success: true,
      message: "Supplier payment recorded.",
      data: result,
    };
  } catch (error) {
    return actionError(error, "Failed to record supplier payment.");
  }
}
