import prisma from "@/lib/prisma";
import { createHash } from "node:crypto";
import {
  ACCOUNT_CODES,
  moneyAccountCode,
  postJournal,
} from "../utils/accounting";
import { postMoneyTransaction } from "./moneyTransactionService";
import { requireCurrentStoreId } from "./storeContextService";

const money = (value) => Math.round(Number(value) * 100) / 100;
const sameMoney = (left, right) => Math.abs(money(left) - money(right)) < 0.01;

const sanitizedPayload = (payload) => {
  if (!payload || typeof payload !== "object") return payload || undefined;
  const blocked = /(secret|password|passwd|authorization|api[-_]?key|token)/i;
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => !blocked.test(key)),
  );
};

const providerForPayment = (payment) =>
  payment.paymentMethod === "COD"
    ? payment.courierProvider
    : payment.paymentGateway;

async function paymentCreditLine(tx, storeId, orderId, amount) {
  const saleWasRecognized = await tx.journalEntry.findFirst({
    where: { storeId, referenceType: "SALE", referenceId: orderId, status: "POSTED" },
    select: { id: true },
  });
  return saleWasRecognized
    ? { accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, credit: amount }
    : { accountCode: ACCOUNT_CODES.SALES, credit: amount };
}

async function updateOrderPaymentTotals(tx, order, storeId) {
  const [paid, refunded] = await Promise.all([
    tx.payment.aggregate({
      where: {
        orderId: order.id,
        storeId,
        status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] },
      },
      _sum: { amount: true },
    }),
    tx.refund.aggregate({
      where: { storeId, orderId: order.id, status: "COMPLETED" },
      _sum: { amount: true },
    }),
  ]);
  const grossPaid = money(paid._sum.amount || 0);
  const refundedAmount = money(refunded._sum.amount || 0);
  const netPaid = Math.max(0, money(grossPaid - refundedAmount));
  const total = money(
    order.orderPrice +
      order.deliveryCharge +
      (order.taxAmount || 0) -
      (order.adminDiscount || 0),
  );
  const dueAmount = Math.max(0, money(total - grossPaid));
  await tx.order.update({
    where: { id: order.id, storeId },
    data: {
      paidAmount: netPaid,
      dueAmount,
      paymentStatus:
        refundedAmount >= grossPaid && grossPaid > 0
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
  return { grossPaid, refundedAmount, netPaid, dueAmount };
}

export async function postCustomerPaymentInTransaction(
  tx,
  {
    paymentId,
    amount,
    transactionId,
    bankTransactionId,
    externalEventId,
    storeAmount,
    cardType,
    cardNo,
    gatewayResponse,
    moneyAccountIdOverride,
    providerCodeOverride,
    providerNameOverride,
    paidAt = new Date(),
    createdBy = "system",
    storeId,
  },
) {
  const payment = await tx.payment.findUnique({
    where: { id: paymentId, storeId },
    include: {
      order: true,
      paymentGateway: true,
      courierProvider: true,
      moneyAccount: true,
    },
  });
  if (!payment) throw new Error("Payment not found.");
  if (payment.order.storeId !== storeId) throw new Error("Payment Order belongs to another Store.");
  if (payment.paymentGateway && payment.paymentGateway.storeId !== storeId) {
    throw new Error("Payment gateway belongs to another Store.");
  }
  if (payment.courierProvider && payment.courierProvider.storeId !== storeId) {
    throw new Error("Courier provider belongs to another Store.");
  }
  if (payment.moneyAccount && payment.moneyAccount.storeId !== storeId) {
    throw new Error("Money account belongs to another Store.");
  }

  const existingMovement = await tx.moneyTransaction.findFirst({
    where: { storeId, paymentId: payment.id, type: "CUSTOMER_PAYMENT" },
  });
  if (existingMovement) {
    return { payment, transaction: existingMovement, duplicate: true };
  }
  if (["FAILED", "CANCELLED", "REFUNDED"].includes(payment.status)) {
    throw new Error(`A ${payment.status.toLowerCase()} payment cannot be posted.`);
  }

  const postingAmount = money(amount ?? payment.amount);
  if (!sameMoney(postingAmount, payment.amount)) {
    throw new Error("Verified payment amount does not match the pending payment.");
  }
  const provider =
    providerForPayment(payment) ||
    (moneyAccountIdOverride
      ? {
          name: providerNameOverride || "Manual collection",
          code: providerCodeOverride || "MANUAL",
          moneyAccountId: moneyAccountIdOverride,
        }
      : null);
  if (!provider) throw new Error("The payment provider is not configured.");
  const moneyAccountId =
    payment.moneyAccountId || moneyAccountIdOverride || provider.moneyAccountId;
  if (!moneyAccountId) {
    throw new Error(`${provider.name} is not mapped to a money account.`);
  }
  const account =
    payment.moneyAccount ||
    (await tx.moneyAccount.findUnique({ where: { id: moneyAccountId, storeId } }));
  if (account && account.storeId !== storeId) {
    throw new Error("The mapped money account belongs to another Store.");
  }
  if (!account?.isActive) throw new Error("The mapped money account is inactive.");

  const result = await postMoneyTransaction(tx, {
    type: "CUSTOMER_PAYMENT",
    amount: postingAmount,
    toAccountId: account.id,
    transactionNo: `PAY-${payment.id}`,
    idempotencyKey: `CUSTOMER_PAYMENT:${payment.id}`,
    paymentId: payment.id,
    reference: transactionId || externalEventId || payment.id,
    note: `${provider.name} customer payment for ${payment.order.orderNo}`,
    transactionDate: paidAt,
    createdBy,
  });
  if (result.duplicate) {
    return { payment, transaction: result.transaction, duplicate: true };
  }

  const updatedPayment = await tx.payment.update({
    where: { id: payment.id, storeId },
    data: {
      status: "PAID",
      gateway: provider.code,
      moneyAccountId: account.id,
      amount: postingAmount,
      storeAmount: storeAmount == null ? payment.storeAmount : money(storeAmount),
      transactionId: transactionId || payment.transactionId,
      bankTransactionId: bankTransactionId || payment.bankTransactionId,
      externalEventId: externalEventId || payment.externalEventId,
      cardType: cardType || payment.cardType,
      cardNo: cardNo || payment.cardNo,
      gatewayResponse: sanitizedPayload(gatewayResponse),
      paidAt,
      postedAt: paidAt,
    },
  });

  const existingLedger = await tx.ledger.findFirst({
    where: { paymentId: payment.id, type: "PAYMENT", direction: "CREDIT" },
  });
  if (!existingLedger) {
    await tx.ledger.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: postingAmount,
        type: "PAYMENT",
        direction: "CREDIT",
        reference: transactionId || externalEventId || payment.id,
      },
    });
  }

  await updateOrderPaymentTotals(tx, payment.order, storeId);
  await postJournal(tx, {
    entryDate: paidAt,
    description: `${provider.name} payment for order ${payment.order.orderNo}`,
    referenceType: "CUSTOMER_PAYMENT",
    referenceId: payment.id,
    createdBy,
    lines: [
      {
        accountCode: moneyAccountCode(account),
        accountName: `${account.type} · ${account.name}`,
        accountType: "ASSET",
        debit: postingAmount,
      },
      await paymentCreditLine(tx, storeId, payment.orderId, postingAmount),
    ],
  });
  await tx.orderTimeline.create({
    data: {
      orderId: payment.orderId,
      orderNo: payment.order.orderNo,
      title:
        payment.paymentMethod === "COD"
          ? "COD Payment Collected"
          : "Payment Successful",
      status: payment.order.status,
      message: `${provider.name} collected ৳${postingAmount}`,
      createdBy,
    },
  });
  return { payment: updatedPayment, transaction: result.transaction, duplicate: false };
}

export async function postCustomerPayment(input) {
  const storeId = await requireCurrentStoreId();
  try {
    return await prisma.$transaction(
      (tx) => postCustomerPaymentInTransaction(tx, { ...input, storeId }),
      { timeout: 30000 },
    );
  } catch (error) {
    if (error?.code === "P2002") {
      const transaction = await prisma.moneyTransaction.findFirst({
        where: {
          paymentId: input.paymentId,
          type: "CUSTOMER_PAYMENT",
          payment: { storeId },
        },
      });
      if (transaction) return { transaction, duplicate: true };
    }
    throw error;
  }
}

export async function postCodCollection({
  orderId,
  amount,
  courierProviderId,
  moneyAccountId,
  reference,
  externalEventId,
  collectedAt = new Date(),
  createdBy = "system",
  serializeOrder = false,
}) {
  const storeId = await requireCurrentStoreId();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId, storeId },
      include: { shipping: true, selectedCourierProvider: true },
    });
    if (!order) throw new Error("Order not found.");
    if (order.paymentMethod !== "COD") {
      throw new Error("Only COD orders can be posted as courier collections.");
    }
    if (serializeOrder) {
      // Concurrent copies of one webhook must contend on the same Order
      // before either can create a new COD Payment.
      await tx.order.update({
        where: { id: order.id, storeId },
        data: { updatedAt: new Date() },
      });
    }
    const resolvedCourierId =
      courierProviderId ||
      order.shipping?.courierProviderId ||
      order.selectedCourierProviderId;
    const courier = resolvedCourierId
      ? await tx.courierProvider.findUnique({
          where: { id: resolvedCourierId, storeId },
        })
      : null;
    if (resolvedCourierId && !courier?.moneyAccountId) {
      throw new Error("The courier or its Money Account mapping is unavailable.");
    }
    const collectionAccountId = courier?.moneyAccountId || moneyAccountId;
    if (!collectionAccountId) {
      throw new Error(
        "Select the Cash or Money Account that received this manual COD collection.",
      );
    }
    const collectionAccount = await tx.moneyAccount.findUnique({
      where: { id: collectionAccountId, storeId },
    });
    if (!collectionAccount?.isActive) {
      throw new Error("The collection Money Account is unavailable.");
    }
    const collectionAmount = money(amount ?? order.dueAmount);
    let payment = await tx.payment.findFirst({
      where: { storeId, orderId: order.id, paymentMethod: "COD" },
      orderBy: { createdAt: "desc" },
    });
    if (!payment) {
      payment = await tx.payment.create({
        data: {
          storeId,
          orderId: order.id,
          gateway: courier?.code || "MANUAL_DELIVERY",
          paymentMethod: "COD",
          courierProviderId: courier?.id || null,
          amount: collectionAmount,
          status: "PENDING",
        },
      });
    } else if (courier && !payment.courierProviderId) {
      payment = await tx.payment.update({
        where: { id: payment.id, storeId },
        data: { courierProviderId: courier.id, gateway: courier.code },
      });
    }
    const posted = await postCustomerPaymentInTransaction(tx, {
      paymentId: payment.id,
      storeId,
      amount: collectionAmount,
      transactionId: reference,
      externalEventId,
      moneyAccountIdOverride: collectionAccount.id,
      providerCodeOverride: courier?.code || "MANUAL_DELIVERY",
      providerNameOverride: courier?.name || "Manual Delivery",
      paidAt: collectedAt,
      createdBy,
    });
    if (order.shipping && !posted.duplicate) {
      await tx.shipping.update({
        where: { id: order.shipping.id, storeId },
        data: {
          ...(courier && { courierProviderId: courier.id }),
          codCollectedAt: collectedAt,
          codCollectedAmount: collectionAmount,
          codCollectionReference: reference || externalEventId || null,
        },
      });
    }
    return posted;
  }, { timeout: 30000 });
}

export async function postProviderFee({
  moneyAccountId,
  amount: rawAmount,
  providerName,
  reference,
  feeDate = new Date(),
  createdBy,
}) {
  const storeId = await requireCurrentStoreId();
  return prisma.$transaction(async (tx) => {
    const amount = money(rawAmount);
    const account = await tx.moneyAccount.findUnique({
      where: { id: moneyAccountId, storeId },
    });
    if (!account?.isActive) throw new Error("Money account is unavailable.");
    const category = await tx.expenseCategory.upsert({
      where: { storeId_name: { storeId, name: "Payment and courier fees" } },
      update: {},
      create: {
        storeId,
        name: "Payment and courier fees",
        createdBy,
        updatedBy: createdBy,
      },
    });
    const expense = await tx.expense.create({
      data: {
        storeId,
        categoryId: category.id,
        moneyAccountId: account.id,
        amount,
        description: `${providerName || account.name} fee`,
        expenseDate: feeDate,
        paymentMethod: account.type,
        createdBy,
        updatedBy: createdBy,
      },
    });
    const movement = await postMoneyTransaction(tx, {
      type: "PROVIDER_FEE",
      amount,
      fromAccountId: account.id,
      transactionNo: `FEE-${expense.id}`,
      idempotencyKey: `PROVIDER_FEE:${expense.id}`,
      expenseId: expense.id,
      reference,
      note: expense.description,
      transactionDate: feeDate,
      createdBy,
    });
    await postJournal(tx, {
      entryDate: feeDate,
      description: expense.description,
      referenceType: "EXPENSE",
      referenceId: expense.id,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.PROVIDER_FEES, debit: amount },
        {
          accountCode: moneyAccountCode(account),
          accountName: `${account.type} · ${account.name}`,
          accountType: "ASSET",
          credit: amount,
        },
      ],
    });
    return { expense, transaction: movement.transaction };
  });
}

export async function postPaymentRefundInTransaction(tx, {
  orderId,
  paymentId,
  amount: rawAmount,
  reason,
  adminNote,
  externalReference,
  refundedAt = new Date(),
  createdBy,
  storeId,
  completeReturnedOrder = false,
}) {
    if (externalReference) {
      const existing = await tx.refund.findFirst({
        where: { storeId, externalReference, status: "COMPLETED" },
      });
      if (existing) {
        if (existing.orderId !== orderId || existing.paymentId !== paymentId || !sameMoney(existing.amount, rawAmount)) {
          throw new Error("Refund reference is already used for another refund.");
        }
        return { refund: existing, duplicate: true };
      }
    }
    const payment = await tx.payment.findUnique({
      where: { id: paymentId, storeId },
      include: { order: true, moneyAccount: true },
    });
    if (!payment || payment.orderId !== orderId) throw new Error("Payment not found.");
    if (payment.order.storeId !== storeId) throw new Error("Order belongs to another Store.");
    if (completeReturnedOrder && !["RETURNED", "REFUNDING"].includes(payment.order.status)) {
      throw new Error("Order is not ready for a completed return refund.");
    }
    if (!["PAID", "PARTIALLY_REFUNDED"].includes(payment.status)) {
      throw new Error("Only a posted payment can be refunded.");
    }
    if (!payment.moneyAccount?.isActive) {
      throw new Error("The original payment account is unavailable.");
    }
    if (payment.moneyAccount.storeId !== storeId) {
      throw new Error("The original payment account belongs to another Store.");
    }
    const amount = money(rawAmount);
    const previous = await tx.refund.aggregate({
      where: { storeId, paymentId, status: "COMPLETED" },
      _sum: { amount: true },
    });
    const refunded = money(previous._sum.amount || 0);
    if (amount <= 0 || money(refunded + amount) > money(payment.amount)) {
      throw new Error("Refund amount exceeds the refundable payment balance.");
    }
    const fullRefund = sameMoney(refunded + amount, payment.amount);
    const refund = await tx.refund.create({
      data: {
        storeId,
        orderId,
        paymentId,
        moneyAccountId: payment.moneyAccount.id,
        amount,
        reason: reason || null,
        adminNote: adminNote || null,
        status: "COMPLETED",
        externalReference: externalReference || null,
        refundedAt,
      },
    });
    const refundTransactionNo = externalReference
      ? `REF-${createHash("sha256").update(externalReference).digest("hex").slice(0, 24)}`
      : `REF-${refund.id}`;
    const movement = await postMoneyTransaction(tx, {
      type: "REFUND",
      amount,
      fromAccountId: payment.moneyAccount.id,
      transactionNo: refundTransactionNo,
      idempotencyKey: externalReference ? `REFUND:${externalReference}` : `REFUND:${refund.id}`,
      paymentId,
      refundId: refund.id,
      reference: externalReference || refund.id,
      note: reason || `Refund for order ${payment.order.orderNo}`,
      transactionDate: refundedAt,
      createdBy,
    });
    await tx.ledger.create({
      data: {
        orderId,
        paymentId,
        amount,
        type: "REFUND",
        direction: "DEBIT",
        description: reason || "Refund",
        reference: externalReference || refund.id,
        createdBy,
      },
    });
    await tx.payment.update({
      where: { id: paymentId, storeId },
      data: { status: fullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    await updateOrderPaymentTotals(tx, payment.order, storeId);
    if (completeReturnedOrder) {
      await tx.order.update({ where: { id: orderId, storeId }, data: { status: "REFUNDED" } });
    }
    await postJournal(tx, {
      entryDate: refundedAt,
      description: `Refund for order ${payment.order.orderNo}`,
      referenceType: "REFUND",
      referenceId: refund.id,
      createdBy,
      lines: [
        { accountCode: ACCOUNT_CODES.SALES_RETURNS, debit: amount },
        {
          accountCode: moneyAccountCode(payment.moneyAccount),
          accountName: `${payment.moneyAccount.type} · ${payment.moneyAccount.name}`,
          accountType: "ASSET",
          credit: amount,
        },
      ],
    });
    await tx.orderTimeline.create({
      data: {
        orderId,
        orderNo: payment.order.orderNo,
        status: completeReturnedOrder ? "REFUNDED" : payment.order.status,
        title: "Refund Completed",
        message: `Refunded ৳${amount} from ${payment.moneyAccount.name}`,
        createdBy: createdBy || "system",
      },
    });
    return { refund, transaction: movement.transaction, duplicate: false };
}

export async function postPaymentRefund({
  orderId, paymentId, amount, reason, adminNote, externalReference, refundedAt, createdBy,
}) {
  const storeId = await requireCurrentStoreId();
  return prisma.$transaction(
    (tx) => postPaymentRefundInTransaction(tx, {
      orderId, paymentId, amount, reason, adminNote, externalReference, refundedAt, createdBy, storeId,
    }),
    { timeout: 30000 },
  );
}
