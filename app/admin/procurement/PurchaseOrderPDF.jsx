"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Eye } from "lucide-react";

const dateLabel = (value) => value ? new Intl.DateTimeFormat("en-BD", { dateStyle: "medium" }).format(new Date(value)) : "—";
const taka = (value) => `BDT ${Number(value || 0).toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function createPdf(po) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  pdf.text("PURCHASE ORDER", 14, 19);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`PO No: ${po.poNo}`, 14, 27);
  pdf.text(`Status: ${po.status}`, 14, 33);
  pdf.text(`Created: ${dateLabel(po.createdAt)}`, 14, 39);
  pdf.text(`Expected: ${dateLabel(po.expectedDate)}`, 14, 45);
  pdf.setFont("helvetica", "bold");
  pdf.text("SUPPLIER", 125, 27);
  pdf.setFont("helvetica", "normal");
  pdf.text(String(po.supplier?.companyName || "—"), 125, 33, { maxWidth: 70 });

  autoTable(pdf, {
    startY: 54,
    head: [["Product", "SKU", "Qty", "Unit cost", "Discount", "Line total"]],
    body: (po.items || []).map((item) => [
      item.product?.title || "Product",
      item.variation?.sku || "—",
      Number(item.quantity || 0).toLocaleString("en-BD"),
      taka(item.unitCost),
      taka(item.discount),
      taka(item.total ?? (Number(item.quantity || 0) * Number(item.unitCost || 0) - Number(item.discount || 0))),
    ]),
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [80, 45, 130] },
    columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 27 } },
  });

  const totalsY = (pdf.lastAutoTable?.finalY || 60) + 9;
  const totals = [
    ["Subtotal", po.subtotal],
    ["Item discounts", (po.items || []).reduce((sum, item) => sum + Number(item.discount || 0), 0)],
    ["Order discount", po.discount],
    ["VAT", po.vat],
    ["Supplier delivery charge", po.shippingCost],
    ["Total", po.total],
    ["Paid", po.paidAmount],
    ["Due", po.dueAmount],
  ];
  autoTable(pdf, {
    startY: totalsY,
    margin: { left: 115, right: 14 },
    body: totals.map(([label, value]) => [label, taka(value)]),
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 1.8 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
  });
  if (po.notes) {
    const notesY = (pdf.lastAutoTable?.finalY || totalsY) + 8;
    pdf.setFont("helvetica", "bold");
    pdf.text("Notes", 14, notesY);
    pdf.setFont("helvetica", "normal");
    pdf.text(String(po.notes), 14, notesY + 6, { maxWidth: 180 });
  }
  return pdf;
}

export default function PurchaseOrderPDF({ purchaseOrder }) {
  const view = () => {
    const blob = createPdf(purchaseOrder).output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };
  const download = () => createPdf(purchaseOrder).save(`${purchaseOrder.poNo || "purchase-order"}.pdf`);

  return <div className="flex gap-1.5">
    <button type="button" onClick={view} title="View PO PDF" aria-label={`View ${purchaseOrder.poNo} PDF`} className="inline-flex min-h-9 items-center gap-1 rounded-brand border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-muted"><Eye className="h-3.5 w-3.5" />View PDF</button>
    <button type="button" onClick={download} title="Download PO PDF" aria-label={`Download ${purchaseOrder.poNo} PDF`} className="inline-flex min-h-9 items-center gap-1 rounded-brand border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-muted"><Download className="h-3.5 w-3.5" />Download</button>
  </div>;
}
