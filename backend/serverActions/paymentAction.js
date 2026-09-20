"use server";

import { postProviderFee } from "@/backend/services/paymentPostingService";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  actionError,
  requireProcurementPermission,
  toDate,
  toNumber,
} from "../utils/procurement";
import { requireCurrentStoreId } from "../services/storeContextService";

export async function createPayment({
  orderId,
  gateway,
  paymentGatewayId,
  courierProviderId,
  paymentMethod,
  amount,
}) {
  await requireProcurementPermission("payment", "create", "order");
  const storeId = await requireCurrentStoreId();
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId, storeId },
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
          where: { id: paymentGatewayId, storeId },
          include: { moneyAccount: true },
        })
      : courierProviderId
        ? await tx.courierProvider.findUnique({
            where: { id: courierProviderId, storeId },
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
    if (provider?.moneyAccount && provider.moneyAccount.storeId !== storeId) {
      throw new Error("The selected payment account belongs to another Store.");
    }
    return tx.payment.create({
      data: {
        storeId,
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
    revalidatePath("/admin/procurement/expenses");
    return { success: true, message: "Provider fee recorded as an expense.", data: result };
  } catch (error) {
    return actionError(error, "Failed to record provider fee.");
  }
}
