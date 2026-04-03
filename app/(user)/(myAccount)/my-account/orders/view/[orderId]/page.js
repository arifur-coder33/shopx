import CustomerInfo from "@/app/admin/orders/_components/components/CustomerInfo";
import OrderHeader from "@/app/admin/orders/_components/components/OrderHeader";
import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import OrderSummary from "@/app/admin/orders/_components/components/OrderSummary";
import OrderTimelineServer from "@/app/admin/orders/_components/components/OrderTimelineServer";
import { auth } from "@/auth";
import { fetchSingleData } from "@/backend/serverActions/fetchDataActon";
import InvoiceButton from "@/components/PDF/getInvoice";

export default async function UerOrderViewPage({ params }) {
  const orderId = params.orderId;
  const session = await auth();
  const userId = session?.user?.id;
  // const fatchData = await getOrderById(orderId, userId);

  const fatchData = await fetchSingleData({
    model: "order",
    where: { id: orderId, userId },
    select: {
      id: true,
      createdAt: true,
      status: true,
      orderNo: true,
      orderPrice: true,
      deliveryCharge: true,
      deliveryAddress: true,
      adminDiscount: true,
      customerName: true,
      phoneNumber: true,
      email: true,
      paymentMethod: true,
      orderItems: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          price: true,
          sku: true,
          thumbnail: true,
        },
      },
    },
  });

  const order = fatchData?.data || {};
  return (
    <div className="space-y-4 gap-2 flex flex-col">
      <OrderHeader
        orderId={order.orderNo}
        status={order.status}
        date={order.createdAt}
      />
      <CustomerInfo customer={order} />
      <OrderItemsTable items={order.orderItems} />
      <OrderSummary
        subtotal={order.orderPrice}
        delivery={order.deliveryCharge}
        adminDiscount={order.adminDiscount}
        total={order.orderPrice + order.deliveryCharge - order.adminDiscount}
      />
      <InvoiceButton orderData={order} actionType={"view"} />
      <OrderTimelineServer orderId={orderId} />
    </div>
  );
}
