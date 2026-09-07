"use client";
import CustomerInfo from "@/app/admin/orders/_components/components/CustomerInfo";
import OrderHeader from "@/app/admin/orders/_components/components/OrderHeader";
import OrderItemsTable from "@/app/admin/orders/_components/components/OrderItemsTable";
import OrderNote from "@/app/admin/orders/_components/components/OrderNote";
import OrderSummary from "@/app/admin/orders/_components/components/OrderSummary";
import { getOrderByOrderNo } from "@/backend/serverActions/orderActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import InvoiceButton from "@/components/PDF/getInvoice";
import OrderPaymentRecovery from "@/components/payments/OrderPaymentRecovery";

import { useEffect, useState } from "react";

export default function OrderInfo({ orderId, orderNo, phoneNumber }) {
  const [order, setOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getData = async () => {
      try {
        const fatchData = await getOrderByOrderNo({
          orderId,
          orderNo,
          phoneNumber,
        });
        setOrder(fatchData.data);
      } catch (error) {
        setError("Failed to load product data.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, [orderId, orderNo, phoneNumber]);

  if (loading)
    return (
      <div>
        <LoadingSpinner message="Just a second.. " />
      </div>
    );
  if (!loading && (!order || error))
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Invalid Order</h1>

        <p className="mt-3 text-gray-500">এই অর্ডারটি খুঁজে পাওয়া যায়নি।</p>
      </div>
    );
  return (
    <div className="max-w-7xl w-full mx-auto space-y-6">
      {/* Header Section */}
      <OrderHeader
        orderId={order?.orderNo}
        status={order.status}
        date={order?.createdAt || "N/A"}
      />

      <OrderPaymentRecovery order={order} onChanged={setOrder} />

      {/* Timeline Section
              <OrderTimeline status={status} /> */}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-11">
        {/* Left Column: Items & Customer Info (Takes 2 parts on Desktop) */}
        <div className="lg:col-span-2 space-y-6  ">
          <OrderItemsTable items={order?.orderItems} />
          <OrderSummary
            subtotal={order?.orderPrice}
            delivery={order?.deliveryCharge}
            adminDiscount={order?.adminDiscount}
            total={
              order?.orderPrice + order?.deliveryCharge - order?.adminDiscount
            }
            paidAmount={order.paidAmount}
            dueAmount={order.dueAmount}
          />
          {order?.note && <OrderNote note={order?.note} />}

          <div className="block lg:hidden">
            <CustomerInfo customer={order} />
          </div>
        </div>

        {/* Right Column: Admin Actions & Info (Takes 1 part on Desktop) */}
        <div className="space-y-6">
          <div className="hidden lg:block">
            <CustomerInfo customer={order} />
          </div>

          <InvoiceButton orderData={order} actionType={"view"} />
        </div>
      </div>
    </div>
  );
}
