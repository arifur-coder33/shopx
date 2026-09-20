import prisma from "@/lib/prisma";
import { postCustomerPayment } from "./paymentPostingService";
import { requireCurrentStoreId } from "./storeContextService";

// These functions are deliberately not server actions. Only provider-verified
// route handlers may call them; a browser must not invoke a posting endpoint.
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
  const storeId = await requireCurrentStoreId();
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId, storeId } });
    if (!payment) throw new Error("Payment not found.");
    if (orderId && orderId !== payment.orderId) throw new Error("Payment does not belong to this Order.");
    if (payment.status === "PAID" || payment.status === status) return payment;
    const updated = await tx.payment.update({
      where: { id: paymentId, storeId },
      data: { status, gatewayResponse },
    });
    const order = await tx.order.findUnique({
      where: { id: payment.orderId, storeId },
      select: { id: true, orderNo: true, status: true, paidAmount: true },
    });
    if (order) {
      if ((order.paidAmount || 0) <= 0) {
        const anotherPendingAttempt = await tx.payment.findFirst({
          where: { orderId: order.id, storeId, id: { not: payment.id }, status: "PENDING" },
          select: { id: true },
        });
        await tx.order.update({
          where: { id: order.id, storeId },
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
