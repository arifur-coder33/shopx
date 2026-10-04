import { addSiyamrupaliFont } from "@/app/fonts/Siyamrupali-normal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generatePackingListPDF(order, databaseShopName) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  addSiyamrupaliFont(doc);
  doc.setFont("Siyamrupali");

  const shopName = databaseShopName || process.env.NEXT_PUBLIC_NEXT_SHOP_NAME || "Shop";
  doc.setFontSize(18);
  doc.text("PACKING LIST", 105, 16, { align: "center" });
  doc.setFontSize(10);
  doc.text(shopName, 14, 27);
  doc.text(`Order: ${order.orderNo}`, 14, 34);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-BD")}`, 14, 41);
  doc.text(`Courier: ${order.shipping?.courierName || order.selectedCourierProvider?.name || "—"}`, 110, 27);
  doc.text(`Consignment: ${order.shipping?.cn || "—"}`, 110, 34);

  doc.setFontSize(11);
  doc.text(order.customerName || "", 14, 53);
  doc.setFontSize(9);
  doc.text(order.phoneNumber || "", 14, 59);
  doc.text(order.deliveryAddress || "", 14, 65, { maxWidth: 180 });

  autoTable(doc, {
    startY: 76,
    head: [["#", "Product", "SKU", "Quantity", "Packed"]],
    body: (order.orderItems || []).map((item, index) => [
      index + 1,
      item.productName,
      item.sku,
      item.quantity,
      "□",
    ]),
    theme: "grid",
    styles: { font: "Siyamrupali", fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: "#334155", textColor: "#ffffff" },
    columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 24 }, 4: { cellWidth: 22 } },
  });

  const finalY = doc.lastAutoTable?.finalY || 90;
  doc.setFontSize(9);
  doc.text(`Total items: ${(order.orderItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}`, 14, finalY + 10);
  doc.text("Packed by: ____________________", 14, finalY + 24);
  doc.text("Checked by: ____________________", 110, finalY + 24);
  doc.save(`Packing-List-${order.orderNo}.pdf`);
}
