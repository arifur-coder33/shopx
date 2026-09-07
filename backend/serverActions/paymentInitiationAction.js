"use server";

import { createBkashPayment } from "@/backend/lib/payments/providers/bkash";
import { createNagadPayment } from "@/backend/lib/payments/providers/nagad";
import { initiateSSLcommerzPayment } from "@/backend/lib/payments/providers/sslcommerz";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import prisma from "@/lib/prisma";

export async function initiateConfiguredPayment(paymentId) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
      paymentGateway: { include: { moneyAccount: true } },
    },
  });
  if (
    !payment ||
    !["ONLINE", "EMI"].includes(payment.paymentMethod) ||
    payment.status !== "PENDING"
  ) {
    return { success: false, message: "Pending online payment not found." };
  }
  const gateway = payment.paymentGateway;
  if (!gateway?.isActive || !gateway.moneyAccountId) {
    return { success: false, message: "The selected gateway is unavailable." };
  }
  const providerConfiguration = getProviderRuntimeConfiguration(
    "gateway",
    gateway,
  );
  if (!providerConfiguration.ready) {
    return {
      success: false,
      message: "The selected gateway is not fully configured.",
    };
  }
  try {
    if (gateway.adapterKey === "SSLCOMMERZ") {
      const response = await initiateSSLcommerzPayment({
        payment,
        providerConfiguration,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: response.transactionId },
      });
      return { success: true, url: response.url };
    }
    if (gateway.adapterKey === "BKASH") {
      const response = await createBkashPayment({
        payment,
        providerConfiguration,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { externalEventId: response.paymentID },
      });
      return { success: true, url: response.bkashURL };
    }
    if (gateway.adapterKey === "NAGAD") {
      const response = await createNagadPayment({
        payment,
        providerConfiguration,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          transactionId: response.transactionId,
          externalEventId: response.externalEventId,
        },
      });
      return { success: true, url: response.url };
    }
    return {
      success: false,
      message: `${gateway.name} has no implemented server payment adapter.`,
    };
  } catch (error) {
    return { success: false, message: error.message || "Payment initiation failed." };
  }
}

export async function initiateOrderPayment(orderId) {
  const paymentId = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { selectedPaymentGateway: true },
    });
    if (
      !order ||
      !["ONLINE", "EMI"].includes(order.paymentMethod) ||
      !order.selectedPaymentGateway?.isActive
    ) {
      throw new Error("This order has no active online payment gateway.");
    }
    if (!order.dueAmount || order.dueAmount <= 0) {
      throw new Error("This order has no outstanding payment.");
    }
    const pending = await tx.payment.findFirst({
      where: { orderId, paymentGatewayId: order.selectedPaymentGatewayId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (pending) return pending.id;
    const payment = await tx.payment.create({
      data: {
        orderId,
        gateway: order.selectedPaymentGateway.code,
        paymentMethod: order.paymentMethod,
        paymentGatewayId: order.selectedPaymentGateway.id,
        amount: order.dueAmount,
        status: "PENDING",
      },
    });
    return payment.id;
  });
  return initiateConfiguredPayment(paymentId);
}

/**
 * Starts a fresh customer-selected payment attempt for an existing unpaid order.
 * Order number + phone are checked together because the public tracking pages do
 * not expose an authenticated customer session for guest orders.
 */
export async function retryCustomerOrderPayment({
  orderNo,
  phoneNumber,
  paymentMethod,
  paymentGatewayId,
}) {
  let paymentId;
  try {
    const method = String(paymentMethod || "").toUpperCase();
    if (!orderNo || !phoneNumber || !["COD", "ONLINE", "EMI"].includes(method)) {
      throw new Error("Select a valid payment method.");
    }
    if (method !== "COD" && !paymentGatewayId) {
      throw new Error("Select an online payment gateway.");
    }

    const attempt = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { orderNo, phoneNumber },
        include: { shipping: true },
      });
      if (!order) throw new Error("Order not found.");
      if (order.status !== "PENDING") {
        throw new Error("Payment method can be changed only before order confirmation.");
      }
      if ((order.paidAmount || 0) > 0 || !order.dueAmount || order.dueAmount <= 0) {
        throw new Error("This order has no unpaid balance.");
      }
      if (order.shipping?.cn) {
        throw new Error("A courier-assigned order cannot change its payment method.");
      }

      let gateway = null;
      if (method !== "COD") {
        gateway = await tx.paymentGateway.findUnique({
          where: { id: paymentGatewayId },
          include: { moneyAccount: true },
        });
        if (!getProviderRuntimeConfiguration("gateway", gateway).ready) {
          throw new Error("The selected payment gateway is unavailable.");
        }
        if (method === "EMI" && gateway.adapterKey !== "SSLCOMMERZ") {
          throw new Error("Installment payment is available only through SSLCommerz.");
        }
      } else {
        const cod = await tx.paymentGateway.findFirst({
          where: { adapterKey: "COD", isActive: true },
          include: { moneyAccount: true },
        });
        if (!getProviderRuntimeConfiguration("gateway", cod).ready) {
          throw new Error("Cash on Delivery is currently unavailable.");
        }
      }

      // A retry is a new immutable attempt. Old unfinished attempts remain in
      // history but cannot later be posted accidentally.
      await tx.payment.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          gateway: method !== "COD" ? gateway.code : "COD",
          paymentMethod: method,
          paymentGatewayId: method !== "COD" ? gateway.id : null,
          courierProviderId: null,
          amount: order.dueAmount,
          status: "PENDING",
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentMethod: method,
          paymentStatus: "PENDING",
          selectedPaymentGatewayId: method !== "COD" ? gateway.id : null,
        },
      });
      await tx.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: order.status,
          title: method === "COD" ? "Payment changed to COD" : "Payment retry started",
          message:
            method === "COD"
              ? "Customer selected Cash on Delivery before order confirmation."
              : `Customer selected ${gateway.name} for a new payment attempt.`,
          createdBy: "customer",
        },
      });
      return { paymentId: payment.id, method };
    });
    paymentId = attempt.paymentId;

    if (attempt.method === "COD") {
      return {
        success: true,
        message: "Payment method changed to Cash on Delivery.",
      };
    }
    const initiated = await initiateConfiguredPayment(attempt.paymentId);
    if (!initiated.success || !initiated.url) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: attempt.paymentId },
          data: { status: "FAILED" },
        }),
        prisma.order.updateMany({
          where: { orderNo, phoneNumber, paidAmount: 0, status: "PENDING" },
          data: { paymentStatus: "FAILED" },
        }),
      ]);
      throw new Error(initiated.message || "Payment could not be initiated.");
    }
    return { success: true, url: initiated.url };
  } catch (error) {
    return {
      success: false,
      message: error?.message || "Payment could not be started.",
      paymentId,
    };
  }
}
