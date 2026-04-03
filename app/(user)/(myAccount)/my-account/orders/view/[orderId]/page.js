import OrderHeader from "@/app/admin/orders/_components/components/OrderHeader";
import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import OrderSummary from "@/app/admin/orders/_components/components/OrderSummary";
import OrderTimelineNew from "@/app/admin/orders/_components/components/OrderTimeLineNew";
import { auth } from "@/auth";
import { getOrderById } from "@/backend/serverActions/orderActions";
import InvoiceButton from "@/components/PDF/getInvoice";

export default async function AccountDashboard({ params }) {
  const orderId = params.orderId;
  const session = await auth();
  const userId = session?.user?.id;
  const fatchData = await getOrderById(orderId, userId);
  const order = fatchData?.data || {};
  const pagination = fatchData?.pagination;
  return (
    <div className="space-y-4 gap-2 flex flex-col">
      <OrderHeader
        orderId={order.orderNo}
        status={order.status}
        date={order.createdAt}
      />
      <OrderItemsTable items={order.orderItems} />
      <OrderSummary
        subtotal={order.orderPrice}
        delivery={order.deliveryCharge}
        adminDiscount={order.adminDiscount}
        total={order.orderPrice + order.deliveryCharge - order.adminDiscount}
      />
      <InvoiceButton orderData={order} actionType={"view"} />
      <OrderTimelineNew orderId={orderId} />
    </div>
  );
}
