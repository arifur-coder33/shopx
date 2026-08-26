"use server";
import prisma from "@/lib/prisma";
export async function createPayment({
  orderId,
  gateway,
  paymentMethod,
  amount,
}) {
  return await prisma.$transaction(async (tx) => {
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

    if (!order) {
      throw new Error("Order not found");
    }

    const totalAmount =
      order.orderPrice +
      order.deliveryCharge +
      (order.taxAmount || 0) -
      (order.adminDiscount || 0);

    const dueAmount = totalAmount - (order.paidAmount || 0);

    if (amount <= 0) {
      throw new Error("Invalid payment amount.");
    }

    if (amount > dueAmount) {
      throw new Error("Payment exceeds due amount.");
    }

    return await tx.payment.create({
      data: {
        orderId,
        gateway,
        paymentMethod,
        amount,
        status: gateway === "COD" ? "UNPAID" : "PENDING",
      },
    });
  });
}

export async function markPaymentSuccess({
  orderId,
  orderNo,
  phoneNumber,
  paymentId,
  amount,
  storeAmount,
  transactionId,
  bankTransactionId,
  cardType,
  cardNo,
  gatewayResponse,
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Payment Update
    const payment = await tx.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: "PAID",
        transactionId,
        gatewayResponse,
        amount,
        storeAmount,
        transactionId,
        bankTransactionId,
        cardType,
        cardNo,
        gatewayResponse,

        paidAt: new Date(),
      },
      include: {
        order: true,
      },
    });

    // 2. Ledger
    await tx.ledger.create({
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        type: "PAYMENT",
        direction: "CREDIT",
      },
    });

    // 3. Total Paid
    const paid = await tx.payment.aggregate({
      where: {
        orderId: payment.orderId,
        status: "PAID",
      },
      _sum: {
        amount: true,
      },
    });

    const paidAmount = paid._sum.amount || 0;

    // 4. Order Total
    const total =
      payment.order.orderPrice +
      payment.order.deliveryCharge +
      (payment.order.taxAmount || 0) -
      (payment.order.adminDiscount || 0);

    const dueAmount = total - paidAmount;

    // 5. Order Update
    await tx.order.update({
      where: {
        id: payment.orderId,
      },
      data: {
        paidAmount,
        dueAmount,
        paymentStatus:
          dueAmount <= 0
            ? "PAID"
            : paidAmount > 0
              ? "PARTIALLY_PAID"
              : "UNPAID",
      },
    });

    // 6. Timeline
    await tx.orderTimeline.create({
      data: {
        orderId: payment.orderId,
        orderNo,
        title: "Payment Successful",
        status: "PENDING",
        message: `Paid ৳${payment.amount}`,
        createdBy: "user",
      },
    });

    return payment;
  });
}

export async function markPaymentFailed({
  paymentId,
  orderId,
  orderNo,
  gatewayResponse,
  reason,
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: "FAILED",
        gatewayResponse,
      },
    });

    await tx.orderTimeline.create({
      data: {
        orderId,
        orderNo,
        title: "Payment Failed",
        status: "PENDING",
        message: reason || "Online payment failed.",
        createdBy: "user",
      },
    });

    return payment;
  });
}

export async function markPaymentCancelled({
  paymentId,
  orderId,
  orderNo,
  gatewayResponse,
  reason,
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    // Already completed payment cannot be cancelled
    if (payment.status === "PAID") {
      return payment;
    }

    const updatedPayment = await tx.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: "CANCELLED",
        gatewayResponse,
      },
    });

    await tx.orderTimeline.create({
      data: {
        orderId,
        orderNo,
        title: "Payment Cancelled",
        status: "PENDING",
        message: reason || "Customer cancelled the payment.",
        createdBy: "user",
      },
    });

    return updatedPayment;
  });
}
