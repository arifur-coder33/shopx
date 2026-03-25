import prisma from "@/lib/prisma";

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
    } = body;

    // 🔎 find shipping using consignment id
    const shipping = await prisma.shipping.findFirst({
      where: {
        cn: consignment_id.toString(),
      },
      include: {
        order: true,
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

    // update order status
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

    // add timeline
    await prisma.orderTimeline.create({
      data: {
        orderId: order.id,
        orderNo: order.orderNo,
        status: newStatus || order.status,
        title: "Courier Update",
        message: tracking_message,
        createdBy: "courier",
        createdAt: new Date(updated_at),
      },
    });

    return Response.json({
      status: "success",
      message: "Webhook received successfully.",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { status: "error", message: "Webhook error" },
      { status: 500 },
    );
  }
}
