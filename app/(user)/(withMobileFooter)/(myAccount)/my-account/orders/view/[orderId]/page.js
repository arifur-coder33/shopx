import CustomerInfo from "@/app/admin/orders/_components/components/CustomerInfo";
import OrderHeader from "@/app/admin/orders/_components/components/OrderHeader";
import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import OrderSummary from "@/app/admin/orders/_components/components/OrderSummary";
import OrderTimelineServer from "@/app/admin/orders/_components/components/OrderTimelineServer";
import { auth } from "@/auth";
import { fetchSingleData } from "@/backend/serverActions/fetchDataActon";
import InvoiceButton from "@/components/PDF/getInvoice";
import OrderPaymentRecovery from "@/components/payments/OrderPaymentRecovery";

export default async function UerOrderViewPage({ params }) {
  const { orderId } = await params;
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
      paymentStatus: true,
      dueAmount: true,
      paidAmount: true,
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
      <OrderPaymentRecovery
        order={{
          id: order.id,
          orderNo: order.orderNo,
          phoneNumber: order.phoneNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentMethod: order.paymentMethod,
          paidAmount: order.paidAmount,
          dueAmount: order.dueAmount,
        }}
      />
      <CustomerInfo customer={order} />
      <OrderItemsTable items={order.orderItems} />
      <OrderSummary
        subtotal={order.orderPrice}
        delivery={order.deliveryCharge}
        adminDiscount={order.adminDiscount}
        total={order.orderPrice + order.deliveryCharge - order.adminDiscount}
        dueAmount={order?.dueAmount}
        paidAmount={order?.paidAmount}
        orderId={orderId}
        paymentMethod={order?.paymentMethod}
      />
      <InvoiceButton orderData={order} actionType={"view"} />

      <OrderTimelineServer orderId={orderId} />
    </div>
  );
}
