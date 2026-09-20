import { createHash, timingSafeEqual } from "node:crypto";
import { getSteadfastDeliveryStatus } from "@/backend/lib/courier/steadfast";
import { getProviderRuntimeConfiguration } from "@/backend/services/providerCredentialService";
import { postCodCollection } from "@/backend/services/paymentPostingService";
import { getCurrentStoreId } from "@/backend/services/storeContextService";
import prisma from "@/lib/prisma";

const STATUS_MAP = {
  pending: "SHIPPED",
  in_review: "SHIPPED",
  hold: "SHIPPED",
  delivered_approval_pending: "SHIPPED",
  partial_delivered_approval_pending: "SHIPPED",
  cancelled_approval_pending: "SHIPPED",
  delivered: "DELIVERED",
  partial_delivered: "DELIVERED",
  cancelled: "CANCELLED",
};
const DELIVERY_STATUSES = new Set([...Object.keys(STATUS_MAP), "unknown"]);

const response = (message, status) =>
  Response.json({ status: "error", message }, { status });

function authorizedBearer(header, expectedToken) {
  const supplied = /^Bearer\s+([^\s]+)$/i.exec(header || "")?.[1];
  if (!supplied || !expectedToken) return false;
  // Hash both values so timingSafeEqual always receives equal-length buffers.
  const suppliedHash = createHash("sha256").update(supplied).digest();
  const expectedHash = createHash("sha256").update(expectedToken).digest();
  return timingSafeEqual(suppliedHash, expectedHash);
}

export async function POST(req) {
  try {
    const storeId = await getCurrentStoreId();
    if (!storeId) return response("Store not found.", 404);

    const provider = await prisma.courierProvider.findFirst({
      where: { storeId, adapterKey: "STEADFAST", isActive: true },
    });
    const configuration = getProviderRuntimeConfiguration("courier", provider);
    if (
      !provider ||
      String(configuration.config.webhookEnabled) !== "true" ||
      !authorizedBearer(req.headers.get("authorization"), configuration.credentials.webhookAuthToken)
    ) {
      return response("Unauthorized webhook.", 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return response("Invalid JSON notification.", 400);
    }
    const notificationType = String(body?.notification_type || "").trim().toLowerCase();
    const consignmentId = String(body?.consignment_id || "").trim();
    const invoice = String(body?.invoice || "").trim();
    const status = String(body?.status || "").trim().toLowerCase();
    if (
      !["delivery_status", "tracking_update"].includes(notificationType) ||
      !/^\d+$/.test(consignmentId) ||
      !invoice ||
      (notificationType === "delivery_status" && !DELIVERY_STATUSES.has(status))
    ) {
      return response("Invalid Steadfast notification.", 400);
    }

    const shipping = await prisma.shipping.findFirst({
      where: { storeId, courierProviderId: provider.id, cn: consignmentId },
      include: { order: true },
    });
    if (!shipping || !shipping.order || shipping.order.storeId !== storeId) {
      return response("Consignment not found.", 404);
    }
    const order = shipping.order;
    if (invoice !== order.orderNo) {
      return response("Invoice does not match the consignment.", 409);
    }

    const isCollection =
      notificationType === "delivery_status" &&
      (status === "delivered" || status === "partial_delivered") &&
      order.paymentMethod === "COD";
    if (isCollection) {
      // A webhook status alone must not credit the courier's Money Account.
      const verified = await getSteadfastDeliveryStatus(
        "cid",
        consignmentId,
        configuration,
      );
      if (
        !verified.success ||
        !["delivered", "partial_delivered"].includes(
          String(verified.status || "").toLowerCase(),
        )
      ) {
        return response("Steadfast delivery is not verified yet.", 503);
      }
      // Temporary business rule: partial delivery posts the full booked COD.
      // Do not take the amount from the incoming webhook body.
      const fullCodAmount = Number(shipping.cod ?? order.dueAmount);
      if (!Number.isFinite(fullCodAmount) || fullCodAmount < 0) {
        return response("Invalid booked COD amount.", 409);
      }
      if (fullCodAmount > 0) {
        await postCodCollection({
          orderId: order.id,
          courierProviderId: provider.id,
          amount: fullCodAmount,
          reference: consignmentId,
          externalEventId: `STEADFAST:${consignmentId}:COLLECTION`,
          createdBy: "steadfast-webhook",
          serializeOrder: true,
        });
      }
    }

    const newStatus = notificationType === "delivery_status" ? STATUS_MAP[status] : null;
    const eventTime = body?.updated_at ? new Date(body.updated_at) : new Date();
    const safeEventTime = Number.isNaN(eventTime.getTime()) ? new Date() : eventTime;
    const eventKey = `STEADFAST:${consignmentId}:${notificationType}:${status}:${body?.updated_at || ""}`;
    await prisma.$transaction(async (tx) => {
      // Late pending/cancelled events cannot undo a completed delivery.
      const current = await tx.order.findUnique({ where: { id: order.id, storeId } });
      if (!current) throw new Error("Order not found.");
      const effectiveStatus = current.status === "DELIVERED" && newStatus !== "DELIVERED"
        ? "DELIVERED"
        : newStatus || current.status;
      if (effectiveStatus !== current.status) {
        await tx.order.update({
          where: { id: order.id, storeId },
          data: { status: effectiveStatus },
        });
      }
      const deliveryFee = Number(body?.delivery_charge);
      if (
        notificationType === "delivery_status" &&
        body?.delivery_charge != null &&
        Number.isFinite(deliveryFee) &&
        deliveryFee >= 0
      ) {
        await tx.shipping.update({
          where: { id: shipping.id, storeId },
          data: { deliveryFee },
        });
      }
      const duplicate = await tx.orderTimeline.findFirst({
        where: { orderId: order.id, message: { contains: eventKey } },
        select: { id: true },
      });
      if (!duplicate) {
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            orderNo: order.orderNo,
            status: effectiveStatus,
            title: "Courier Update",
            message: `${String(body?.tracking_message || status || "Tracking update")} [${eventKey}]`,
            createdBy: "courier",
            createdAt: safeEventTime,
          },
        });
      }
    });

    return Response.json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    // Never log request headers or credential-bearing provider configuration.
    console.error("Steadfast webhook failed:", error?.code || error?.name || "Error");
    return response("Webhook could not be processed.", 500);
  }
}
