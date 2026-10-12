import { generateCode } from "../utils/generateCode";

const positiveAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Transaction amount must be greater than zero.");
  }
  return amount;
};

export async function postMoneyTransaction(
  tx,
  {
    type,
    amount: rawAmount,
    fromAccountId,
    toAccountId,
    transactionNo,
    idempotencyKey,
    shareholderId,
    supplierPaymentId,
    expenseId,
    paymentId,
    refundId,
    reference,
    note,
    transactionDate = new Date(),
    createdBy,
    allowNegativeFromAccount = false,
  },
) {
  const amount = positiveAmount(rawAmount);
  if (!fromAccountId && !toAccountId) {
    throw new Error("A source or destination money account is required.");
  }
  if (fromAccountId && fromAccountId === toAccountId) {
    throw new Error("Source and destination accounts must be different.");
  }

  if (idempotencyKey) {
    const existing = await tx.moneyTransaction.findFirst({
      where: { idempotencyKey },
      include: { fromAccount: true, toAccount: true },
    });
    if (existing) return { transaction: existing, duplicate: true };
  }

  const ids = [...new Set([fromAccountId, toAccountId].filter(Boolean))];
  const accounts = await tx.moneyAccount.findMany({
    where: { id: { in: ids }, isActive: true },
  });
  if (accounts.length !== ids.length) {
    throw new Error("One or more money accounts are inactive or unavailable.");
  }
  const fromAccount = accounts.find((account) => account.id === fromAccountId);
  const toAccount = accounts.find((account) => account.id === toAccountId);

  if (fromAccount) {
    if (allowNegativeFromAccount) {
      // Courier balances represent settlements due from/to the provider; a
      // withheld courier fee can exceed that consignment's COD collection.
      await tx.moneyAccount.update({
        where: { id: fromAccount.id },
        data: { balance: { decrement: amount }, updatedBy: createdBy },
      });
    } else {
      const debited = await tx.moneyAccount.updateMany({
        where: { id: fromAccount.id, isActive: true, balance: { gte: amount } },
        data: { balance: { decrement: amount }, updatedBy: createdBy },
      });
      if (debited.count !== 1) {
        throw new Error(`Insufficient balance in ${fromAccount.name}.`);
      }
    }
  }
  if (toAccount) {
    await tx.moneyAccount.update({
      where: { id: toAccount.id },
      data: { balance: { increment: amount }, updatedBy: createdBy },
    });
  }

  const resolvedTransactionNo =
    transactionNo ||
    (await generateCode(tx, {
      name: "MONEY_TRANSACTION",
      prefix: "MT-",
      padding: 8,
    }));
  const transaction = await tx.moneyTransaction.create({
    data: {
      transactionNo: resolvedTransactionNo,
      type,
      amount,
      fromAccountId: fromAccount?.id || null,
      toAccountId: toAccount?.id || null,
      shareholderId: shareholderId || null,
      supplierPaymentId: supplierPaymentId || null,
      expenseId: expenseId || null,
      paymentId: paymentId || null,
      refundId: refundId || null,
      idempotencyKey: idempotencyKey || null,
      reference: reference || null,
      note: note || null,
      transactionDate,
      createdBy,
    },
    include: { fromAccount: true, toAccount: true },
  });
  return { transaction, duplicate: false };
}
