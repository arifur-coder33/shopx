"use client";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
import AdminOrderAddressEditor from "./AdminOrderAddressEditor";
import BanglaQrPaymentReview from "./BanglaQrPaymentReview";
import AdminActions from "./components/AdminActions";
import CustomerInfo from "./components/CustomerInfo";
import DocumentActions from "./components/DocumentActions";
import OrderFooter from "./components/OrderFooter";
import OrderHeader from "./components/OrderHeader";
import OrderItemsTable from "./components/OrderItemsTable";
import OrderNote from "./components/OrderNote";
import OrderSummary from "./components/OrderSummary";
import OrderTimelineClient from "./components/OrderTimelineClient";
import PaymentSummary from "./components/PaymentSummary";
import CourierManagement from "./courier/CourierManagement";
import OrderRiskAssessment from "./OrderRiskAssessment";
import { CheckCircle2, Clock3 } from "lucide-react";

// Server component ke lazy load kora hocche
const OrderTimelineServer = dynamic(
  () => import("./components/OrderTimelineServer"),
  {
    suspense: true,
  },
);

export default function OrderDetailsPage({ order, children }) {
  // Global State for the order
  const { data: session } = useSession();
  const permissions = session?.user?.permissions;
  const [status, setStatus] = useState(order.status || "DELIVERED");
  const [shipping, setShipping] = useState(order.shipping);
  const [courier, setCourier] = useState(order.courier || "");
  const [adminDiscount, setAdminDiscount] = useState(order.adminDiscount || 0);
  const [note, setNote] = useState(order.note || "");
  const [adminNote, setAdminNote] = useState(order.adminNote || "");
  const [isLoading, setIsLoading] = useState(false);
  // Handlers
  const handleUpdateStatus = () => alert(`Status updated to ${status}!`);
  const handleCourierUpdate = () => alert(`Courier Order Created: ${courier}`);

  const timeline = [
    {
      status: "PENDING",
      title: "Order Placed",
      message: "Your order has been received",
      date: "13 Mar 2026 • 10:32 AM",
    },
    {
      status: "PROCESSING",
      title: "Processing Order",
      message: "Seller is preparing your item",
      date: "13 Mar 2026 • 11:00 AM",
    },
    {
      status: "SHIPPED",
      title: "Shipped",
      message: "Your package left the warehouse",
      date: "14 Mar 2026 • 09:20 AM",
    },
    {
      status: "DELIVERED",
      title: "Delivered",
      message: "Package delivered successfully",
      date: "15 Mar 2026 • 03:10 PM",
    },
  ];
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <OrderHeader
          orderId={order.orderNo}
          status={status}
          date={order.createdAt || "N/A"}
        />
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm ${order.customerConfirmedAt ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <span className="inline-flex items-center gap-2 font-semibold">{order.customerConfirmedAt ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{order.customerConfirmedAt ? "Customer re-confirmed this order" : "Customer has not re-confirmed this order"}</span>
          {order.customerConfirmedAt && <time dateTime={new Date(order.customerConfirmedAt).toISOString()} className="text-xs">{new Date(order.customerConfirmedAt).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}</time>}
        </div>
        <OrderRiskAssessment order={order} />
        <div className="card p-4 text-sm">
          <strong>Order source</strong>
          <p className="mt-1 text-text-muted">
            {[
              order.marketingAttribution?.channel || "Unattributed",
              order.marketingAttribution?.source,
              order.marketingAttribution?.campaign ||
                order.marketingAttribution?.campaignId,
              order.marketingAttribution?.ad ||
                order.marketingAttribution?.adId,
            ]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>

        {/* Timeline Section
        <OrderTimeline status={status} /> */}

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-11">
          {/* Left Column: Items & Customer Info (Takes 2 parts on Desktop) */}
          <div className="lg:col-span-2 space-y-6  ">
            <OrderItemsTable items={order?.orderItems} />
            <OrderSummary
              subtotal={order.orderPrice}
              delivery={order.deliveryCharge}
              adminDiscount={adminDiscount}
              total={order.orderPrice + order.deliveryCharge - adminDiscount}
              dueAmount={order.dueAmount}
              paidAmount={order.paidAmount}
              orderId={order.id}
              paymentMethod={order.paymentMethod}
            />
            <OrderNote note={order?.note} />
            <PaymentSummary
              payments={order.payments}
              paidAmount={order?.paidAmount}
              dueAmount={order?.dueAmount}
            />
            <BanglaQrPaymentReview
              order={order}
              canUpdate={hasUIPermission(permissions, "order", "update")}
            />
            {status !== "CANCELLED" && (
              <CourierManagement
                setShipping={setShipping}
                setStatus={setStatus}
                status={status}
                order={order}
              />
            )}
            {/* Mobile-first: Customer info stays with details usually, or move to sidebar */}
            <div className="block lg:hidden">
              <CustomerInfo customer={order} />
            </div>

            {children}
            <Suspense fallback={<div>Loading order timeline...</div>}>
              <OrderTimelineClient orderId={order.id} />
            </Suspense>
          </div>

          {/* Right Column: Admin Actions & Info (Takes 1 part on Desktop) */}
          <div className="space-y-6">
            <div className="hidden lg:block">
              <CustomerInfo customer={order} />
            </div>
            <AdminOrderAddressEditor
              order={order}
              canUpdate={hasUIPermission(permissions, "order", "update")}
            />

            <AdminActions
              status={status}
              setStatus={setStatus}
              courier={courier}
              setCourier={setCourier}
              adminDiscount={adminDiscount}
              setAdminDiscount={setAdminDiscount}
              adminNote={adminNote}
              setAdminNote={setAdminNote}
              onUpdateStatus={handleUpdateStatus}
              onCreateCourier={handleCourierUpdate}
              orderId={order.id}
            />

            <DocumentActions order={order} hasConsignment={Boolean(shipping?.cn)} />
          </div>
        </div>
      </div>

      {hasUIPermission(permissions, "order", "update") && (
        <OrderFooter
          hasCourierBooking={Boolean(shipping)}
          status={status}
          setStatus={setStatus}
          courier={courier}
          setCourier={setCourier}
          onCreateCourier={handleCourierUpdate}
          orderId={order.id}
        />
      )}
    </div>
  );
}
