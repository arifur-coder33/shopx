"use server";

import { postPaymentRefund } from "@/backend/services/paymentPostingService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { actionError, requireProcurementPermission } from "@/backend/utils/procurement";

export async function refundPayment(input) {
  const userId = await requireProcurementPermission("accounting", "update");
  const result = await postPaymentRefund({ ...input, createdBy: userId });
  revalidatePath("/admin/accounts");
  revalidatePath("/admin/orders");
  return result;
}

export async function getReturnRefundQueue() {
  try {
    await requireProcurementPermission("order", "update");
    const [refunds, history] = await Promise.all([prisma.refund.findMany({
      where: { returnReceiptId: { not: null }, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, amount: true, reason: true, adminNote: true, createdAt: true, status: true,
        refundDestinationType: true, refundDestinationDetails: true,
        paymentId: true, moneyAccount: { select: { id: true, name: true, type: true, isActive: true } },
        payment: { select: { id: true, gateway: true, paymentMethod: true, transactionId: true, status: true } },
        order: { select: { id: true, orderNo: true, customerName: true, phoneNumber: true } },
        returnReceipt: { select: { id: true, reasonType: true, description: true, createdAt: true, items: { select: { quantity: true, disposition: true, orderItem: { select: { productName: true, sku: true } } } } } },
      },
    }), prisma.refund.findMany({
      where: { returnReceiptId: { not: null }, status: { in: ["APPROVED", "COMPLETED", "CANCELLED"] } },
      orderBy: { updatedAt: "desc" }, take: 50,
      select: { id: true, amount: true, status: true, adminNote: true, order: { select: { orderNo: true, customerName: true } } },
    })]);
    return { success: true, data: { refunds, history } };
  } catch (error) { return actionError(error, "Could not load the refund queue."); }
}

export async function getApprovedReturnRefunds() {
  try {
    await requireProcurementPermission("accounting", "update");
    const [refunds, moneyAccounts, history] = await Promise.all([
      prisma.refund.findMany({
        where: { returnReceiptId: { not: null }, status: "APPROVED" },
        orderBy: { updatedAt: "asc" },
        select: {
          id: true, amount: true, reason: true, adminNote: true, createdAt: true,
          refundDestinationType: true, refundDestinationDetails: true,
          paymentId: true, moneyAccount: { select: { id: true, name: true, type: true } },
          payment: { select: { id: true, gateway: true, paymentMethod: true, transactionId: true, status: true } },
          order: { select: { id: true, orderNo: true, customerName: true, phoneNumber: true } },
          returnReceipt: { select: { id: true, reasonType: true, description: true, items: { select: { quantity: true, disposition: true, orderItem: { select: { productName: true, sku: true } } } } } },
        },
      }),
      prisma.moneyAccount.findMany({ where: { isActive: true, type: { not: "COURIER" } }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true, balance: true } }),
      prisma.refund.findMany({
        where: { returnReceiptId: { not: null }, status: "COMPLETED" },
        orderBy: { refundedAt: "desc" }, take: 50,
        select: { id: true, amount: true, status: true, reason: true, externalReference: true, refundedAt: true, refundDestinationType: true, refundDestinationDetails: true, moneyAccount: { select: { name: true, type: true } }, order: { select: { orderNo: true, customerName: true } } },
      }),
    ]);
    return { success: true, data: { refunds, moneyAccounts, history } };
  } catch (error) { return actionError(error, "Could not load approved refunds."); }
}

export async function decideReturnRefund(refundId, decision, amount, decisionNote = "") {
  try {
    await requireProcurementPermission("order", "update");
    const queued = await prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, amount: true, status: true, returnReceiptId: true, adminNote: true } });
    if (!queued?.returnReceiptId || queued.status !== "PENDING") throw new Error("This refund is no longer awaiting a decision.");
    const note = String(decisionNote || "").trim().slice(0, 500);
    if (decision === "DENY") {
      const denied = await prisma.refund.updateMany({ where: { id: queued.id, status: "PENDING" }, data: { status: "CANCELLED", adminNote: [queued.adminNote, `Refund denied${note ? `: ${note}` : ""}`].filter(Boolean).join("\n") } });
      if (denied.count !== 1) throw new Error("Another admin has already decided this refund.");
      revalidatePath("/admin/refunds");
      return { success: true, message: "Refund request denied; no money was deducted." };
    }
    if (decision !== "APPROVE") throw new Error("Choose approve or deny.");
    const approvedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(approvedAmount) || approvedAmount <= 0 || approvedAmount > queued.amount) throw new Error(`Refund amount must be greater than zero and no more than ৳${queued.amount.toFixed(2)}.`);
    const approved = await prisma.refund.updateMany({ where: { id: queued.id, status: "PENDING" }, data: { amount: approvedAmount, status: "APPROVED", adminNote: [queued.adminNote, note ? `Admin decision: ${note}` : null].filter(Boolean).join("\n") } });
    if (approved.count !== 1) throw new Error("Another admin has already decided this refund.");
    revalidatePath("/admin/refunds");
    revalidatePath("/admin/accounts/refunds");
    return { success: true, message: `${approvedAmount.toFixed(2)} refund approved. Choose its payout destination and source account to complete it.` };
  } catch (error) { return actionError(error, "Could not update the refund decision."); }
}

export async function completeQueuedReturnRefund(refundId, settings = {}) {
  try {
    const userId = await requireProcurementPermission("accounting", "update");
    const queued = await prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, orderId: true, paymentId: true, amount: true, reason: true, adminNote: true, returnReceiptId: true, status: true, payment: { select: { gateway: true, paymentMethod: true, transactionId: true } } } });
    if (!queued?.returnReceiptId || !queued.paymentId || queued.status !== "APPROVED") throw new Error("Approve this refund before completing payment.");
    const destinationType = settings.destinationType === "CUSTOMER_PROVIDED" ? "CUSTOMER_PROVIDED" : "ORIGINAL_PAYMENT";
    const destinationDetails = destinationType === "CUSTOMER_PROVIDED"
      ? String(settings.destinationDetails || "").trim().slice(0, 500)
      : `Original payment · ${queued.payment?.gateway || queued.payment?.paymentMethod || "payment method"}${queued.payment?.transactionId ? ` · Ref ${queued.payment.transactionId}` : ""}`;
    if (!destinationDetails) throw new Error("Enter the customer's refund destination details.");
    const sourceMoneyAccountId = String(settings.sourceMoneyAccountId || "");
    if (!sourceMoneyAccountId) throw new Error("Select the business account to pay the refund from.");
    const result = await postPaymentRefund({ orderId: queued.orderId, paymentId: queued.paymentId, pendingRefundId: queued.id, amount: queued.amount, reason: queued.reason, adminNote: queued.adminNote, externalReference: String(settings.externalReference || "").trim() || undefined, refundFromAccountId: sourceMoneyAccountId, refundDestinationType: destinationType, refundDestinationDetails: destinationDetails, createdBy: userId });
    revalidatePath("/admin/refunds");
    revalidatePath("/admin/orders");
    revalidatePath("/admin/returns");
    revalidatePath("/admin/accounts");
    return { success: true, message: `৳${Number(result.refund.amount).toFixed(2)} refund marked complete.` };
  } catch (error) { return actionError(error, "Could not complete this refund."); }
}
