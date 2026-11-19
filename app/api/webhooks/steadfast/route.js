import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { describeSteadfastEvent } from "@/lib/steadfastTimeline";
import { updateCourierOrderStatus } from "@/backend/services/bundleReservationService";
import { postCodCollection, postProviderFee } from "@/backend/services/paymentPostingService";
import {
  getCourierWebhookSecret,
} from "@/backend/services/providerCredentialService";

function hasValidSignature(provider, rawBody, signature) {
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  try {
    const secret = getCourierWebhookSecret(provider);
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest();
    return timingSafeEqual(expected, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req) {
  try {
    // Verify the exact bytes Steadfast sent before parsing or mutating anything.
    // The configured webhook secret (Steadfast API secret by default) signs
    // X-Signature; Authorization Bearer is not required by this receiver.
    const rawBody = await req.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ status: "error", message: "Invalid JSON." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ status: "error", message: "Invalid webhook body." }, { status: 400 });
    }

    const {
      notification_type,
      consignment_id,
      delivery_charge,
      delivery_fee,
      updated_at,
      collected_amount,
      cod_amount,
    } = body;
    const status = String(body.status ?? body.delivery_status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    const consignments = [
      ...(consignment_id == null ? [] : [consignment_id]),
      ...(Array.isArray(body.consignments)
        ? body.consignments
            .map((item) =>
              typeof item === "object" ? item?.consignment_id ?? item?.cn : item,
            )
            .filter((id) => id != null)
        : []),
    ];
    const consignmentIds = [...new Set(consignments.map(String))];

    const shipments = consignmentIds.length ? await prisma.shipping.findMany({
      where: {
        cn: { in: consignmentIds },
        isManualEntry: false,
        courierProvider: { is: { adapterKey: "STEADFAST" } },
      },
      include: {
        order: true,
        courierProvider: true,
      },
    }) : [];

    const signature = req.headers.get("x-signature") || "";
    const candidates = new Map(shipments.map(({ courierProvider }) => [courierProvider.id, courierProvider]));
    let providers = [...candidates.values()].filter((provider) => hasValidSignature(provider, rawBody, signature));
    if (!providers.length) {
      // Account events and parcels booked outside this storefront can still
      // arrive at the account's callback URL.
      const configuredProviders = await prisma.courierProvider.findMany({
        where: { adapterKey: "STEADFAST", encryptedCredentials: { not: null } },
        select: { id: true, adapterKey: true, encryptedCredentials: true },
      });
      providers = configuredProviders.filter((provider) => hasValidSignature(provider, rawBody, signature));
    }
    if (!providers.length) {
      return Response.json({ status: "error", message: "Unauthorized webhook." }, { status: 401 });
    }
    const providerIds = providers.map(({ id }) => id);
    const matchedShipments = shipments.filter(({ courierProviderId }) => providerIds.includes(courierProviderId));

    const eventDate = updated_at ? new Date(updated_at) : new Date();
    const validEventDate = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;
    const eventKey = `STEADFAST:${body.event_id || req.headers.get("idempotency-key") || createHash("sha256").update(rawBody).digest("hex")}`;
    const eventTitles = {
      delivery_status: "Delivery status",
      tracking_update: "Tracking update",
      consignment_update: "Consignment changed",
      return_list_accepted: "Return list accepted",
      cancel_request: "Cancellation request",
      return_request: "Return request",
      pickup_request: "Pickup request",
    };
    const detailText = describeSteadfastEvent(notification_type, body);
    const statusMap = {
      pending: "SHIPPED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      partial_delivered: "DELIVERED",
    };
    const currentStatus = notification_type === "delivery_status" && Object.hasOwn(statusMap, status)
      ? statusMap[status]
      : undefined;
    const activeOrderStatuses = ["PENDING", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERY_FAILED"];

    for (const currentShipping of matchedShipments) {
      const currentConsignmentId = String(currentShipping.cn);
      const order = currentShipping.order;
      const perConsignmentEventKey = `${eventKey}:${currentConsignmentId}`;
      const duplicateTimeline = await prisma.orderTimeline.findFirst({
        where: { orderId: order.id, createdBy: "courier", message: { endsWith: `[${perConsignmentEventKey}]` } },
        select: { id: true },
      });
      if (duplicateTimeline) continue;

      // Only delivery_status changes order state; the other parcel events are
      // recorded in the timeline without guessing a business-state transition.
      const canApplyStatus = currentStatus && activeOrderStatuses.includes(order.status);
      const statusChanged = canApplyStatus && Boolean(await updateCourierOrderStatus(
        prisma, order, currentStatus, { expectedStatus: order.status, shippingId: currentShipping.id, allowEarlyShipment: status === "pending" },
      ));
      if (canApplyStatus && !statusChanged) {
        return Response.json({ status: "retry", message: "Order changed during sync." }, { status: 503 });
      }
      const statusApplied = statusChanged || (currentStatus && order.status === currentStatus);
      const actualDeliveryFee = Number(delivery_fee ?? delivery_charge);
      const hasDeliveryFee = (delivery_fee ?? delivery_charge) != null &&
        Number.isFinite(actualDeliveryFee) && actualDeliveryFee >= 0;
      if (hasDeliveryFee) {
        await prisma.shipping.update({
          where: { id: currentShipping.id },
          data: { deliveryFee: actualDeliveryFee },
        });
      }

      // A completed delivery is the collection event for a full COD shipment.
      // Partial delivery is not financially posted without an explicit collected amount.
      const isFullCollection = notification_type === "delivery_status" && status === "delivered";
      const hasExplicitPartialCollection =
        notification_type === "delivery_status" &&
        status === "partial_delivered" &&
        Number(collected_amount) > 0;
      if (statusApplied && order.paymentMethod === "COD" && (isFullCollection || hasExplicitPartialCollection)) {
        const reportedCollection = Number(collected_amount || cod_amount || currentShipping.cod || order.dueAmount);
        const acceptedCollection = Math.min(
          Math.max(0, Number(order.dueAmount ?? reportedCollection)),
          reportedCollection,
        );
        if (acceptedCollection > 0) {
          await postCodCollection({
            orderId: order.id,
            courierProviderId: currentShipping.courierProviderId,
            amount: acceptedCollection,
            reference: currentConsignmentId,
            externalEventId: perConsignmentEventKey,
            collectedAt: validEventDate,
            createdBy: "steadfast-webhook",
          });
        }
      }

      const isFeeFinal =
        notification_type === "delivery_status" &&
        ["delivered", "partial_delivered", "cancelled"].includes(status);
      if (statusApplied && isFeeFinal && hasDeliveryFee && actualDeliveryFee > 0) {
        await postProviderFee({
          moneyAccountId: currentShipping.courierProvider.moneyAccountId,
          amount: actualDeliveryFee,
          providerName: currentShipping.courierProvider.name,
          reference: currentConsignmentId,
          feeDate: validEventDate,
          externalEventId: `STEADFAST:${currentConsignmentId}:DELIVERY_FEE`,
          createdBy: "steadfast-webhook",
        });
      }
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: statusApplied ? currentStatus : order.status,
          title: Object.hasOwn(eventTitles, notification_type) ? eventTitles[notification_type] : "Steadfast update",
          message: `${detailText} [${perConsignmentEventKey}]`,
          createdBy: "courier",
          createdAt: validEventDate,
        },
      });
    }

    await prisma.courierProvider.updateMany({
      where: { id: { in: providerIds } },
      data: { webhookLastReceivedAt: new Date() },
    });

    return Response.json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    console.error("Steadfast webhook failed:", error?.code || error?.name);
    return Response.json(
      { status: "error", message: "Webhook error" },
      { status: 500 },
    );
  }
}
