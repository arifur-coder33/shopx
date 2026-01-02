"use client";
import InvoiceButton from "@/components/PDF/getInvoice";
import { useState } from "react";
import AdminActions from "./components/AdminActions";
import CustomerInfo from "./components/CustomerInfo";
import DocumentActions from "./components/DocumentActions";
import { generateInvoicePDF } from "./components/GenerateInvoice"; // আপনার ইম্পোর্ট
import OrderFooter from "./components/OrderFooter";
import OrderHeader from "./components/OrderHeader";
import OrderItemsTable from "./components/OrderItemsTable";
import OrderNote from "./components/OrderNote";
import OrderSummary from "./components/OrderSummary";
import OrderTimeline from "./components/OrderTimeline";
import CourierManagement from "./courier/CourierManagement";
export default function OrderDetailsPage({ order }) {
  // Global State for the order
  const [status, setStatus] = useState(order.status || "DELIVERED");
  const [courier, setCourier] = useState(order.courier || "");
  const [adminDiscount, setAdminDiscount] = useState(order.adminDiscount || 0);
  const [note, setNote] = useState(order.note || "");
  const [adminNote, setAdminNote] = useState(order.adminNote || "");
  const [isLoading, setIsLoading] = useState(false);
  // Handlers
  const handleUpdateStatus = () => alert(`Status updated to ${status}!`);
  const handleCourierUpdate = () => alert(`Courier Order Created: ${courier}`);

  // Wrapper for PDF Download to keep logic clean
  const handleDownloadInvoice = (type) => {
    // এখানে আপনার আগের লজিক বা generateInvoicePDF ফাংশন কল করবেন
    if (generateInvoicePDF) {
      generateInvoicePDF({ actionType: type, orderData: order });
    } else {
      console.log("Generate PDF Function called for:", type);
    }
  };
  const handleServerDownload = () => {
    downloadInvoice(order);
  };
  console.log("order in details page:", order);
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <OrderHeader
          orderId={order.orderNo}
          status={status}
          date={order.createdAt || "N/A"}
        />

        {/* Timeline Section */}
        <OrderTimeline status={status} />

        {/* Main Grid Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Items & Customer Info (Takes 2 parts on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <OrderItemsTable items={order?.orderItems} />
            <OrderSummary
              subtotal={order.orderPrice}
              delivery={order.deliveryCharge}
              adminDiscount={adminDiscount}
              total={order.orderPrice + order.deliveryCharge - adminDiscount}
            />
            <OrderNote note={order?.note} />

            {status !== "PENDING" && (
              <CourierManagement
                setStatus={setStatus}
                status={status}
                order={order}
              />
            )}
            {/* Mobile-first: Customer info stays with details usually, or move to sidebar */}
            <div className="block lg:hidden">
              <CustomerInfo customer={order} />
            </div>
          </div>

          {/* Right Column: Admin Actions & Info (Takes 1 part on Desktop) */}
          <div className="space-y-6">
            <div className="hidden lg:block">
              <CustomerInfo customer={order} />
            </div>

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

            <DocumentActions
              onDownload={() => handleDownloadInvoice("download")}
              onView={() => handleDownloadInvoice("view")}
              onAWB={() => alert("Downloading AWB...")}
            />
            <InvoiceButton orderData={order} actionType={"view"} />
          </div>
        </div>
      </div>

      <OrderFooter
        status={status}
        setStatus={setStatus}
        courier={courier}
        setCourier={setCourier}
        onCreateCourier={handleCourierUpdate}
        orderId={order.id}
      />
    </div>
  );
}
