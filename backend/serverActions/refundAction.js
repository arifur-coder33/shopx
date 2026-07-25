"use server";
import prisma from "@/lib/prisma";

export async function refundPayment({
  orderId,
  paymentId,
  amount,
  reason,
  adminNote,
}) {
  return await prisma.$transaction(async (tx) => {
    // Payment খুঁজে বের করা
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.status !== "PAID") {
      throw new Error("Only paid payments can be refunded.");
    }

    // আগের Refund গুলো
    const previousRefunds = await tx.refund.findMany({
      where: {
        paymentId,
        status: "COMPLETED",
      },
      select: {
        amount: true,
      },
    });

    const refundedAmount = previousRefunds.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    if (refundedAmount + amount > payment.amount) {
      throw new Error("Refund amount exceeds paid amount.");
    }

    const isFullRefund = refundedAmount + amount === payment.amount;

    // Refund তৈরি
    const refund = await tx.refund.create({
      data: {
        orderId,
        paymentId,
        amount,
        reason,
        adminNote,
        status: "COMPLETED",
        refundedAt: new Date(),
      },
    });

    // Ledger Entry
    await tx.ledger.create({
      data: {
        orderId,
        paymentId,
        amount,
        type: "REFUND",
        direction: "DEBIT",
        description: reason || "Refund",
      },
    });

    // Payment Status Update
    await tx.payment.update({
      where: {
        id: paymentId,
      },
      data: {
        status: isFullRefund ? "REFUNDED" : "PARTIAL_REFUNDED",
      },
    });

    // Order Status Update
    await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
        paymentStatus: isFullRefund ? "REFUNDED" : "PARTIAL_REFUNDED",
      },
    });

    // Timeline Entry
    await tx.orderTimeline.create({
      data: {
        orderId,
        title: "Refund Completed",
        description: `Refunded ৳${amount}`,
      },
    });

    return refund;
  });
}
