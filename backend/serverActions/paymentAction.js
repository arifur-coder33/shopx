"use server";

import {
  postCustomerPayment,
  postProviderFee,
} from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  actionError,
  requireProcurementPermission,
  toDate,
  toNumber,
} from "../utils/procurement";

export async function createPayment({
  orderId,
  gateway,
  paymentGatewayId,
  courierProviderId,
  paymentMethod,
  amount,
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        orderPrice: true,
        deliveryCharge: true,
        taxAmount: true,
        adminDiscount: true,
        paidAmount: true,
      },
    });
    if (!order) throw new Error("Order not found.");
    const total =
      order.orderPrice +
      order.deliveryCharge +
      (order.taxAmount || 0) -
      (order.adminDiscount || 0);
    const due = total - (order.paidAmount || 0);
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > due) {
      throw new Error("Payment amount is invalid or exceeds the order due amount.");
    }
    const provider = paymentGatewayId
      ? await tx.paymentGateway.findUnique({
          where: { id: paymentGatewayId },
          include: { moneyAccount: true },
        })
      : courierProviderId
        ? await tx.courierProvider.findUnique({
            where: { id: courierProviderId },
            include: { moneyAccount: true },
          })
        : null;
    const providerConfiguration = provider
      ? getProviderRuntimeConfiguration(
          paymentGatewayId ? "gateway" : "courier",
          provider,
        )
      : null;
    if ((paymentGatewayId || courierProviderId) && !providerConfiguration?.ready) {
      throw new Error("The selected payment provider is unavailable.");
    }
    return tx.payment.create({
      data: {
        orderId,
        gateway: provider?.code || gateway || "MANUAL",
        paymentGatewayId: paymentGatewayId || null,
        courierProviderId: courierProviderId || null,
        paymentMethod,
        amount: numericAmount,
        status: "PENDING",
      },
    });
  });
}

export async function markPaymentSuccess(input) {
  return postCustomerPayment({
    paymentId: input.paymentId,
    amount: input.amount,
    storeAmount: input.storeAmount,
    transactionId: input.transactionId,
    bankTransactionId: input.bankTransactionId,
    externalEventId: input.externalEventId || input.transactionId,
    cardType: input.cardType,
    cardNo: input.cardNo,
    gatewayResponse: input.gatewayResponse,
    paidAt: input.paidAt || new Date(),
    createdBy: "payment-provider",
  });
}

async function markUnsuccessful({ paymentId, orderId, orderNo, gatewayResponse, reason }, status) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("Payment not found.");
    if (payment.status === "PAID" || payment.status === status) return payment;
    const updated = await tx.payment.update({
      where: { id: paymentId },
      data: { status, gatewayResponse },
    });
    const order = await tx.order.findUnique({
      where: { id: orderId || payment.orderId },
      select: { id: true, orderNo: true, status: true, paidAmount: true },
    });
    if (order) {
      if ((order.paidAmount || 0) <= 0) {
        const anotherPendingAttempt = await tx.payment.findFirst({
          where: {
            orderId: order.id,
            id: { not: payment.id },
            status: "PENDING",
          },
          select: { id: true },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: anotherPendingAttempt ? "PENDING" : status },
        });
      }
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: orderNo || order.orderNo,
          title: status === "FAILED" ? "Payment Failed" : "Payment Cancelled",
          status: order.status,
          message: reason || `Online payment ${status.toLowerCase()}.`,
          createdBy: "payment-provider",
        },
      });
    }
    return updated;
  });
}

export async function markPaymentFailed(input) {
  return markUnsuccessful(input, "FAILED");
}

export async function markPaymentCancelled(input) {
  return markUnsuccessful(input, "CANCELLED");
}

export async function recordProviderFee(formData) {
  try {
    const userId = await requireProcurementPermission("expense", "create");
    const values = Object.fromEntries(formData.entries());
    const result = await postProviderFee({
      moneyAccountId: values.moneyAccountId,
      amount: toNumber(values.amount),
      providerName: String(values.providerName || "").trim(),
      reference: String(values.reference || "").trim() || undefined,
      feeDate: toDate(values.feeDate),
      createdBy: userId,
    });
    revalidatePath("/admin/accounts");
    revalidatePath("/admin/accounts/expenses");
    return { success: true, message: "Provider fee recorded as an expense.", data: result };
  } catch (error) {
    return actionError(error, "Failed to record provider fee.");
  }
}
