import prisma from "@/lib/prisma";
import { postCodCollection } from "@/backend/services/paymentPostingService";

export async function POST(req) {
  try {
    const body = await req.json();

    const {
      notification_type,
      consignment_id,
      invoice,
      status,
      tracking_message,
      delivery_charge,
      updated_at,
      collected_amount,
      cod_amount,
    } = body;

    // 🔎 find shipping using consignment id
    const shipping = await prisma.shipping.findFirst({
      where: {
        cn: consignment_id.toString(),
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

    const order = shipping.order;

    // status mapping courier → system
    const statusMap = {
      pending: "SHIPPED",
      delivered: "DELIVERED",
      cancelled: "CANCELLED",
      partial_delivered: "DELIVERED",
      unknown: "SHIPPED",
    };

    const newStatus = statusMap[status];

    if (shipping.courierProvider?.adapterKey !== "STEADFAST") {
      return Response.json(
        { status: "error", message: "Consignment is not mapped to SteadFast." },
        { status: 409 },
      );
    }

    // Update operational delivery status. This alone is not a financial post.
    if (newStatus && order.status !== newStatus) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: newStatus,
        },
      });
    }

    // update delivery charge if provided
    if (delivery_charge) {
      await prisma.shipping.update({
        where: { id: shipping.id },
        data: {
          deliveryFee: delivery_charge,
        },
      });
    }

    const eventDate = updated_at ? new Date(updated_at) : new Date();
    const eventKey = `STEADFAST:${consignment_id}:${notification_type || "status"}:${status}:${updated_at || ""}`;
    const duplicateTimeline = await prisma.orderTimeline.findFirst({
      where: { orderId: order.id, message: { contains: eventKey } },
      select: { id: true },
    });
    if (!duplicateTimeline) {
      await prisma.orderTimeline.create({
        data: {
          orderId: order.id,
          orderNo: order.orderNo,
          status: newStatus || order.status,
          title: "Courier Update",
          message: `${tracking_message || status} [${eventKey}]`,
          createdBy: "courier",
          createdAt: eventDate,
        },
      });
    }

    // A completed delivery is the collection event for a full COD shipment.
    // Partial delivery is not financially posted without an explicit collected amount.
    const isFullCollection = status === "delivered";
    const hasExplicitPartialCollection =
      status === "partial_delivered" && Number(collected_amount) > 0;
    if (
      order.paymentMethod === "COD" &&
      (isFullCollection || hasExplicitPartialCollection)
    ) {
      await postCodCollection({
        orderId: order.id,
        courierProviderId: shipping.courierProviderId,
        amount: Number(collected_amount || cod_amount || shipping.cod || order.dueAmount),
        reference: String(consignment_id),
        externalEventId: eventKey,
        collectedAt: eventDate,
        createdBy: "steadfast-webhook",
      });
    }

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
