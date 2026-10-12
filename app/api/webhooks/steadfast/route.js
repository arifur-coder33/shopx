import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { postCodCollection, postProviderFee } from "@/backend/services/paymentPostingService";
import {
  getCourierWebhookSecret,
} from "@/backend/services/providerCredentialService";

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

    const {
      notification_type,
      consignment_id,
      status,
      tracking_message,
      delivery_charge,
      delivery_fee,
      updated_at,
      collected_amount,
      cod_amount,
    } = body;
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

    if (consignmentIds.length === 0) {
      return Response.json({ status: "error", message: "Missing consignment ID." }, { status: 400 });
    }

    // Find the mapped account so the webhook can be authenticated with its
    // encrypted SteadFast secret key before any order or finance changes.
    const shipping = await prisma.shipping.findFirst({
      where: {
        cn: { in: consignmentIds },
      },
      include: {
        order: true,
        courierProvider: true,
      },
    });

    if (!shipping) {
      return Response.json(
        { status: "error", message: "Invalid consignment ID." },
        { status: 404 },
      );
    }

    if (shipping.courierProvider?.adapterKey !== "STEADFAST") {
      return Response.json(
        { status: "error", message: "Consignment is not mapped to SteadFast." },
        { status: 409 },
      );
    }

    const secretKey = getCourierWebhookSecret(shipping.courierProvider);
    const signature = req.headers.get("x-signature") || "";
    if (!secretKey || !/^[\da-f]{64}$/i.test(signature)) {
      return Response.json({ status: "error", message: "Unauthorized webhook." }, { status: 401 });
    }
    const expected = createHmac("sha256", secretKey).update(rawBody).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return Response.json({ status: "error", message: "Unauthorized webhook." }, { status: 401 });
    }

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
    const eventDetails = { ...body };
    delete eventDetails.event_id;
    delete eventDetails.notification_type;
    const detailText = ` ${JSON.stringify(eventDetails)}`;

    // status mapping courier → system
    const statusMap = {
      pending: "SHIPPED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      partial_delivered: "DELIVERED",
      unknown: "SHIPPED",
    };

    const newStatus = notification_type === "delivery_status" ? statusMap[status] : undefined;

    for (const currentConsignmentId of consignmentIds) {
      const currentShipping =
        currentConsignmentId === String(shipping.cn)
          ? shipping
          : await prisma.shipping.findFirst({
              where: { cn: currentConsignmentId },
              include: { order: true, courierProvider: true },
            });
      if (
        !currentShipping ||
        currentShipping.courierProvider?.adapterKey !== "STEADFAST" ||
        currentShipping.courierProviderId !== shipping.courierProviderId
      ) continue;

      const order = currentShipping.order;
      const currentStatus =
        notification_type === "delivery_status" ? statusMap[status] : undefined;

      // Only delivery_status changes order state; the other parcel events are
      // recorded in the timeline without guessing a business-state transition.
      if (currentStatus && order.status !== currentStatus) {
        await prisma.order.update({ where: { id: order.id }, data: { status: currentStatus } });
      }
      const actualDeliveryFee = Number(delivery_fee ?? delivery_charge);
      const hasDeliveryFee = (delivery_fee ?? delivery_charge) != null &&
        Number.isFinite(actualDeliveryFee) && actualDeliveryFee >= 0;
      if (hasDeliveryFee) {
        await prisma.shipping.update({
          where: { id: currentShipping.id },
          data: { deliveryFee: actualDeliveryFee },
        });
      }

      const perConsignmentEventKey = `${eventKey}:${currentConsignmentId}`;
      const duplicateTimeline = await prisma.orderTimeline.findFirst({
        where: { orderId: order.id, message: { contains: perConsignmentEventKey } },
        select: { id: true },
      });
      if (!duplicateTimeline) {
        await prisma.orderTimeline.create({
          data: {
            orderId: order.id,
            orderNo: order.orderNo,
            status: currentStatus || order.status,
            title: eventTitles[notification_type] || "SteadFast update",
            message: `${detailText} [${perConsignmentEventKey}]`,
            createdBy: "courier",
            createdAt: validEventDate,
          },
        });
      }

      // A completed delivery is the collection event for a full COD shipment.
      // Partial delivery is not financially posted without an explicit collected amount.
      const isFullCollection = notification_type === "delivery_status" && status === "delivered";
      const hasExplicitPartialCollection =
        notification_type === "delivery_status" &&
        status === "partial_delivered" &&
        Number(collected_amount) > 0;
      if (order.paymentMethod === "COD" && (isFullCollection || hasExplicitPartialCollection)) {
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
      if (isFeeFinal && hasDeliveryFee && actualDeliveryFee > 0) {
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
    }

    await prisma.courierProvider.update({
      where: { id: shipping.courierProviderId },
      data: { webhookLastReceivedAt: new Date() },
    });

    return Response.json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch {
    return Response.json(
      { status: "error", message: "Webhook error" },
      { status: 500 },
    );
  }
}
