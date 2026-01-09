import { addSiyamrupaliFont } from "@/app/fonts/Siyamrupali-normal";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import QRCode from "qrcode";

export const downloadAWBPDF = async (data) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [100, 150],
  });

  const shopName = process.env.NEXT_SHOP_NAME || "My Shop";

  addSiyamrupaliFont(doc);
  doc.setFont("Siyamrupali");

  /* ===== HEADER ===== */
  doc.setFillColor(200, 200, 200);
  doc.rect(5, 5, 90, 18, "F");

  doc.setFontSize(12);
  doc.text(shopName, 50, 14, { align: "center" });

  doc.setFontSize(9);
  doc.text(`ID: ${data.shopId}`, 50, 19, { align: "center" });

  /* ===== BARCODE ===== */
  const barcodeCanvas = document.createElement("canvas");
  JsBarcode(barcodeCanvas, data.sfId, {
    format: "CODE128",
    displayValue: false,
    height: 40,
  });

  doc.addImage(barcodeCanvas.toDataURL("image/png"), "PNG", 5, 26, 90, 15);

  /* ===== QR CODE ===== */
  const qrDataUrl = await QRCode.toDataURL(data.sfId, {
    margin: 1,
  });

  doc.addImage(qrDataUrl, "PNG", 6, 43, 25, 25);

  /* ===== ORDER INFO ===== */
  doc.setFontSize(8);
  doc.text(`Invoice : ${data.invoice}`, 35, 48);
  doc.text(`SF-ID : ${data.sfId}`, 35, 53);
  doc.text(`D. Type : ${data.deliveryType}`, 35, 58);
  doc.text(`WGT : ${data.weight} KG`, 35, 63);

  /* ===== CUSTOMER (Bangla) ===== */
  doc.rect(5, 70, 90, 30);

  doc.setFontSize(9);
  doc.text(`Name : ${data.name}`, 7, 78);
  doc.text(`Phone : ${data.phone}`, 7, 85);

  doc.text(`Address : ${data.address}`, 7, 92, { maxWidth: 86 });

  /* ===== COD ===== */
  doc.rect(5, 105, 45, 12);
  doc.rect(50, 105, 45, 12);

  doc.text("COD", 27, 113, { align: "center" });
  doc.text(String(data.cod), 73, 113, { align: "center" });

  /* ===== FOOTER ===== */
  doc.setFontSize(8);
  doc.text(data.courierName, 50, 125, { align: "center" });

  doc.save(`label-${data.invoice}.pdf`);
};
