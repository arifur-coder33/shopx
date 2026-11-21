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

function hasValidBearerToken(provider, authorization) {
  const token = /^Bearer\s+(.+)$/i.exec(String(authorization || ""))?.[1]?.trim();
  if (!token) return false;
  try {
    const secret = getCourierWebhookSecret(provider);
    if (!secret) return false;
    const expected = Buffer.from(secret);
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
  } catch {
    return false;
  }
}

function hasValidCredentials(provider, rawBody, req) {
  return hasValidBearerToken(provider, req.headers.get("authorization")) &&
    hasValidSignature(provider, rawBody, req.headers.get("x-signature") || "");
}

export async function POST(req) {
  try {
    // Verify the exact bytes Steadfast sent before parsing or mutating anything.
    // The configured webhook secret (Steadfast API secret by default) is both
    // the Bearer token and the HMAC key, as specified by Steadfast.
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

    const notificationType = String(body.notification_type || "").trim().toLowerCase();
    const {
      consignment_id,
      delivery_charge,
      delivery_fee,
      updated_at,
      collected_amount,
      cod_amount,
    } = body;
    // Some Steadfast payloads use `status` for the HTTP/result code and put
    // the parcel state in `delivery_status`; prefer the explicit parcel field.
    const status = String(body.delivery_status ?? body.status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
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
    const invoiceIds = [...new Set([body.invoice, body.merchant_order_id]
      .filter((invoice) => invoice != null && String(invoice).trim())
      .map((invoice) => String(invoice).trim()))];

    const shipmentMatchers = [
      ...(consignmentIds.length ? [{ cn: { in: consignmentIds } }] : []),
      ...(invoiceIds.length ? [{ orderNo: { in: invoiceIds } }] : []),
    ];
    const shipments = shipmentMatchers.length ? await prisma.shipping.findMany({
      where: {
        OR: shipmentMatchers,
        isManualEntry: false,
        courierProvider: { is: { adapterKey: "STEADFAST" } },
      },
      include: {
        order: true,
        courierProvider: true,
      },
    }) : [];

    const candidates = new Map(shipments.map(({ courierProvider }) => [courierProvider.id, courierProvider]));
    let providers = [...candidates.values()].filter((provider) => hasValidCredentials(provider, rawBody, req));
    if (!providers.length) {
      // Account events and parcels booked outside this storefront can still
      // arrive at the account's callback URL.
      const configuredProviders = await prisma.courierProvider.findMany({
        where: { adapterKey: "STEADFAST", encryptedCredentials: { not: null } },
        select: { id: true, adapterKey: true, encryptedCredentials: true },
      });
      providers = configuredProviders.filter((provider) => hasValidCredentials(provider, rawBody, req));
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
    const detailText = describeSteadfastEvent(notificationType, body);
    const statusMap = {
      pending: "SHIPPED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      partial_delivered: "DELIVERED",
    };
    const currentStatus = notificationType === "delivery_status" && Object.hasOwn(statusMap, status)
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
      const isFullCollection = notificationType === "delivery_status" && status === "delivered";
      const hasExplicitPartialCollection =
        notificationType === "delivery_status" &&
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
        notificationType === "delivery_status" &&
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
          title: Object.hasOwn(eventTitles, notificationType) ? eventTitles[notificationType] : "Steadfast update",
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
