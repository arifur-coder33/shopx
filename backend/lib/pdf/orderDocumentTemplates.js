import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { formatOrderAddress } from "@/lib/formatOrderAddress";
import { escapeDocumentHtml as escape, getOrderDocumentFontCss } from "./orderDocumentFont";

function documentHtml(title, body, styles = "") {
  return `<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      ${getOrderDocumentFontCss()}
      * { box-sizing: border-box; }
      body { margin: 0; color: #172033; font: 14px BanglaFont, sans-serif; overflow-wrap: anywhere; }
      h1, p { margin: 0 0 6px; }
      h1 { font-size: 22px; }
      ${styles}
    </style></head><body>${body}</body></html>`;
}

export function getPackingListTemplate(order, shopName) {
  const rows = order.orderItems.map((item, index) => `<tr>
    <td>${index + 1}</td><td>${escape(item.productName)}</td><td>${escape(item.sku)}</td>
    <td>${escape(item.quantity)}</td><td><span class="checkbox"></span></td>
  </tr>`).join("");
  return documentHtml("Packing List", `<header>
    <div><h1>Packing List</h1><p>${escape(shopName)}</p>
    <p>Order: ${escape(order.orderNo)}</p><p>Date: ${escape(new Date(order.createdAt).toLocaleDateString("en-BD", { timeZone: "Asia/Dhaka" }))}</p></div>
    <div><p>Courier: ${escape(order.shipping?.courierName || order.selectedCourierProvider?.name || "—")}</p>
    <p>Consignment: ${escape(order.shipping?.cn || "—")}</p></div>
    </header>
    <section class="customer"><p><strong>${escape(order.customerName)}</strong></p>
    <p>${escape(order.phoneNumber)}</p><p>${escape(formatOrderAddress(order))}</p></section>
    <table><thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Quantity</th><th>Packed</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <footer><p>Total items: ${order.orderItems.reduce((sum, item) => sum + item.quantity, 0)}</p>
    <p>Packed by: ____________________ &emsp; Checked by: ____________________</p></footer>`,
  `
    header { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
    .customer { border: 1px solid #cbd5e1; padding: 4mm; margin: 4mm 0; }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; }
    th, td { padding: 2mm; text-align: left; border: 1px solid #cbd5e1; vertical-align: top; }
    th { background: #edf2f8; }
    th:first-child { width: 8mm; }
    th:nth-child(3) { width: 30mm; }
    th:nth-child(4) { width: 24mm; }
    th:nth-child(5) { width: 18mm; }
    thead { display: table-header-group; }
    tr, footer { break-inside: avoid; }
    footer { margin-top: 5mm; }
    .checkbox { display: inline-block; width: 4mm; height: 4mm; border: 1px solid currentColor; }
  `);
}

export async function getAwbTemplate(order, shopName) {
  const consignment = order.shipping.cn;
  const barcode = {};
  JsBarcode(barcode, consignment, { format: "CODE128", displayValue: false });
  const bars = barcode.encodings.map(({ data }) => data).join("");
  const path = Array.from(bars, (bar, i) => bar === "1" ? `M${i} 0h1v40h-1z` : "").join("");
  const qrCode = await QRCode.toDataURL(consignment, { margin: 1 });
  return documentHtml("Air Waybill", `<header>
    <h1>${escape(shopName)}</h1><p>Air Waybill · ${escape(order.shipping.courierName || order.selectedCourierProvider?.name || "Courier")}</p>
    ${process.env.NEXT_PUBLIC_PATHAO_STORE_ID && (order.shipping.courierProvider?.adapterKey === "PATHAO" || /^pathao/i.test(order.shipping.courierName || "")) ? `<p>Store ID: ${escape(process.env.NEXT_PUBLIC_PATHAO_STORE_ID)}</p>` : ""}
    </header>
    <svg role="img" aria-label="Consignment barcode" viewBox="-10 0 ${bars.length + 20} 40" preserveAspectRatio="none"><path d="${path}"/></svg>
    <div class="shipment"><img src="${qrCode}" alt="Consignment QR code">
    <div><p>Invoice: ${escape(order.orderNo)}</p><p>Consignment: ${escape(consignment)}</p>
    <p>Delivery type: Home</p><p>Weight: ${escape(order.orderWeight || 0.5)} kg</p></div></div>
    <section><p><strong>${escape(order.customerName)}</strong></p>
    <p>${escape(order.phoneNumber)}</p><p>${escape(formatOrderAddress(order))}</p></section>
    <p class="cod">COD: ৳${escape(order.shipping.cod ?? order.dueAmount ?? 0)}</p>`,
  `
    @page { size: 100mm 150mm; }
    header { text-align: center; background: #edf2f8; padding: 2mm; }
    h1 { font-size: 18px; }
    body { font-size: 13px; }
    svg { display: block; width: 100%; height: 15mm; margin: 3mm 0; }
    .shipment { display: flex; align-items: center; gap: 4mm; margin-bottom: 3mm; }
    .shipment img { width: 25mm; height: 25mm; }
    section, .cod { border: 1px solid #cbd5e1; padding: 2.5mm; break-inside: avoid; }
    .cod { margin-top: 3mm; font-weight: bold; }
  `);
}
