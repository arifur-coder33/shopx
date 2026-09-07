"use client";

import { downloadAWBPDF } from "@/app/admin/orders/_components/components/GenerateAWB";
import { generateInvoicePDF } from "@/app/admin/orders/_components/components/GenerateInvoice";
import { generatePackingListPDF } from "@/app/admin/orders/_components/components/GeneratePackingList";
import { FileText, PackageCheck, Printer } from "lucide-react";

const button = "inline-flex min-h-9 items-center gap-1 rounded-brand border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

export default function DeliveryPrintActions({ order }) {
  const shipping = order.shipping;
  const awbData = {
    shopId: process.env.NEXT_PUBLIC_PATHAO_STORE_ID || "",
    invoice: order.orderNo,
    sfId: shipping?.cn || order.orderNo,
    deliveryType: "Home",
    weight: order.orderWeight || 0.5,
    name: order.customerName || "",
    phone: order.phoneNumber || "",
    address: [order.deliveryAddress, order.thana, order.city].filter(Boolean).join(", "),
    cod: shipping?.cod ?? order.dueAmount ?? 0,
    courierName: shipping?.courierName || order.selectedCourierProvider?.name || "Courier",
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" className={button} onClick={() => generateInvoicePDF({ actionType: "download", orderData: order })}>
        <FileText className="h-3.5 w-3.5" /> Invoice
      </button>
      <button type="button" className={button} onClick={() => generatePackingListPDF(order)}>
        <PackageCheck className="h-3.5 w-3.5" /> Packing list
      </button>
      <button type="button" disabled={!shipping?.cn} className={button} title={shipping?.cn ? "Download AWB" : "Create courier order first"} onClick={() => downloadAWBPDF(awbData)}>
        <Printer className="h-3.5 w-3.5" /> AWB
      </button>
    </div>
  );
}
