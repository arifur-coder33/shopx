import { createHash, timingSafeEqual } from "node:crypto";
import prisma from "@/lib/prisma";
import { getCourierWebhookSecret } from "@/backend/services/providerCredentialService";
import { postCodCollection, postProviderFee } from "@/backend/services/paymentPostingService";

const integrationSecretHeader = "X-Pathao-Merchant-Webhook-Integration-Secret";
const integrationSecret = "f3992ecc-59da-4cbe-a049-a13da2018d51";

function response(payload, status) {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set(integrationSecretHeader, integrationSecret);
  return new Response(JSON.stringify(payload), { status, headers });
}

function equalSecret(received, expected) {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

const eventStatuses = {
  "order.delivered": "DELIVERED",
  "order.partial-delivery": "DELIVERED",
  "order.returned": "RETURNED",
  "order.delivery-failed": "DELIVERY_FAILED",
  "order.pickup-failed": "DELIVERY_FAILED",
  "order.in-transit": "SHIPPED",
  "order.picked": "SHIPPED",
  "order.at-the-sorting-hub": "SHIPPED",
  "order.assigned-for-delivery": "SHIPPED",
  "order.received-at-last-mile-hub": "SHIPPED",
  "order.return-id-created": "RETURNING",
  "order.return-in-transit": "RETURNING",
  "order.returned-to-merchant": "RETURNED",
};

export async function POST(req) {
  try {
    const provider = await prisma.courierProvider.findFirst({
      where: { adapterKey: "PATHAO" },
      select: { id: true, name: true, moneyAccountId: true, encryptedCredentials: true, adapterKey: true },
    });
    const secret = getCourierWebhookSecret(provider);
    if (!secret) {
      return response({ status: "error", message: "Pathao webhook secret is not configured." }, 503);
    }

    const received = req.headers.get("x-pathao-signature") || req.headers.get("x-signature") || "";
    if (!equalSecret(received, secret)) {
      return response({ status: "error", message: "Unauthorized webhook." }, 401);
    }

    const rawBody = await req.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return response({ status: "error", message: "Invalid JSON." }, 400);
    }

    const event = String(body.event || body.notification_type || "unknown");
    if (event === "webhook_integration") {
      await prisma.courierProvider.update({ where: { id: provider.id }, data: { webhookLastReceivedAt: new Date() } });
      return response({ status: "success", message: "Pathao webhook integration verified." }, 202);
    }

    const invoice = String(body.merchant_order_id || body.invoice || "");
    const cn = body.consignment_id == null ? "" : String(body.consignment_id);
    let shipping = await prisma.shipping.findFirst({
      where: {
        courierProviderId: provider.id,
        OR: [
          ...(cn ? [{ cn }] : []),
          ...(invoice ? [{ order: { orderNo: invoice } }] : []),
        ],
      },
      include: { order: true },
    });
    if (!shipping && invoice && cn) {
      const order = await prisma.order.findUnique({
        where: { orderNo: invoice },
        include: { shipping: true },
      });
      if (order && !order.shipping) {
        shipping = await prisma.shipping.upsert({
          where: { orderId: order.id },
          create: {
            orderId: order.id,
            orderNo: order.orderNo,
            cn,
            courierName: provider.name,
            courierProviderId: provider.id,
            deliveryFee: Number.isFinite(Number(body.delivery_fee)) ? Number(body.delivery_fee) : null,
          },
          update: {
            cn,
            courierName: provider.name,
            courierProviderId: provider.id,
            ...(Number.isFinite(Number(body.delivery_fee)) && { deliveryFee: Number(body.delivery_fee) }),
          },
          include: { order: true },
        });
      }
    }
    if (!shipping) {
      return response({ status: "error", message: "Pathao consignment was not found." }, 404);
    }

    const normalizedStatus = String(body.order_status || "").toLowerCase().replaceAll("_", "-");
    const nextStatus = eventStatuses[event] || eventStatuses[`order.${normalizedStatus}`];
    const eventKey = `PATHAO:${body.event_id || req.headers.get("idempotency-key") || createHash("sha256").update(rawBody).digest("hex")}`;
    const eventDate = new Date(body.timestamp || body.updated_at || Date.now());
    const createdAt = Number.isNaN(eventDate.getTime()) ? new Date() : eventDate;
    const actualDeliveryFee = Number(body.delivery_fee);
    const hasDeliveryFee = body.delivery_fee !== undefined && body.delivery_fee !== null &&
      Number.isFinite(actualDeliveryFee) && actualDeliveryFee >= 0;

    if (nextStatus && shipping.order.status !== nextStatus) {
      await prisma.order.update({ where: { id: shipping.orderId }, data: { status: nextStatus } });
    }
    if (hasDeliveryFee) {
      await prisma.shipping.update({ where: { id: shipping.id }, data: { deliveryFee: actualDeliveryFee } });
    }

    const existingTimeline = await prisma.orderTimeline.findFirst({
      where: { orderId: shipping.orderId, message: { contains: eventKey } },
      select: { id: true },
    });
    if (!existingTimeline) {
      await prisma.orderTimeline.create({
        data: {
          orderId: shipping.orderId,
          orderNo: shipping.order.orderNo,
          status: nextStatus || shipping.order.status,
          title: `Pathao update: ${event}`,
          message: `${JSON.stringify(body)} [${eventKey}]`,
          createdBy: "courier",
          createdAt,
        },
      });
    }

    const collectedAmount = Number(body.collected_amount);
    if (
      shipping.order.paymentMethod === "COD" &&
      ["order.delivered", "order.partial-delivery"].includes(event) &&
      Number.isFinite(collectedAmount) && collectedAmount > 0
    ) {
      const due = Math.max(0, Number(shipping.order.dueAmount ?? collectedAmount));
      const acceptedCollection = Math.min(collectedAmount, due);
      if (acceptedCollection > 0) {
        await postCodCollection({
          orderId: shipping.orderId,
          courierProviderId: provider.id,
          amount: acceptedCollection,
          reference: cn || invoice,
          externalEventId: eventKey,
          collectedAt: createdAt,
          createdBy: "pathao-webhook",
        });
      }
    }

    const feeEvents = new Set([
      "order.delivered",
      "order.partial-delivery",
      "order.returned",
      "order.delivery-failed",
      "order.pickup-failed",
      "order.pickup-cancelled",
      "order.paid-return",
      "order.exchanged",
      "order.returned-to-merchant",
    ]);
    if (hasDeliveryFee && actualDeliveryFee > 0 && feeEvents.has(event)) {
      await postProviderFee({
        moneyAccountId: provider.moneyAccountId,
        amount: actualDeliveryFee,
        providerName: provider.name,
        reference: cn || invoice,
        feeDate: createdAt,
        externalEventId: `PATHAO:${cn || invoice}:DELIVERY_FEE`,
        createdBy: "pathao-webhook",
      });
    }

    await prisma.courierProvider.update({ where: { id: provider.id }, data: { webhookLastReceivedAt: new Date() } });
    return response({ status: "success", message: "Pathao webhook received." }, 200);
  } catch {
    return response({ status: "error", message: "Webhook error." }, 500);
  }
}
