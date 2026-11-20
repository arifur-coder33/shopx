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

export async function getAwbTemplate(order, shopName, logo = "", merchantId = "") {
  const consignment = order.shipping.cn;
  const barcode = {};
  JsBarcode(barcode, consignment, { format: "CODE128", displayValue: false });
  const bars = barcode.encodings.map(({ data }) => data).join("");
  const path = Array.from(bars, (bar, i) => bar === "1" ? `M${i} 0h1v40h-1z` : "").join("");
  const qrCode = await QRCode.toDataURL(consignment, { margin: 1 });
  const steadfastAwb = order.shipping.courierProvider?.adapterKey === "STEADFAST";
  const area = [order.thana, order.city].filter(Boolean).join(", ");
  const printedAt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "short", timeStyle: "short" }).format(new Date());
  return documentHtml("Steadfast Parcel Label", `<main class="label">
    <header>
      ${logo ? `<img class="shop-logo" src="${escape(logo)}" alt="">` : ""}
      <div class="shop"><h1>${escape(shopName)}</h1>${steadfastAwb && merchantId ? `<p>Merchant ID: ${escape(merchantId)}</p>` : ""}</div>
    </header>
    ${process.env.NEXT_PUBLIC_PATHAO_STORE_ID && (order.shipping.courierProvider?.adapterKey === "PATHAO" || /^pathao/i.test(order.shipping.courierName || "")) ? `<p>Store ID: ${escape(process.env.NEXT_PUBLIC_PATHAO_STORE_ID)}</p>` : ""}
    <div class="barcode"><svg role="img" aria-label="Consignment barcode" viewBox="-10 0 ${bars.length + 20} 40" preserveAspectRatio="none"><path d="${path}"/></svg><strong>${escape(consignment)}</strong></div>
    <div class="shipment"><img src="${qrCode}" alt="Consignment QR code"><div class="details">
      <p><span>INVOICE</span><b>${escape(order.orderNo)}</b></p><p><span>SF-ID</span><b>${escape(consignment)}</b></p>
      <p><span>DELIVERY</span><b>Home</b></p><p><span>WEIGHT</span><b>${escape(order.orderWeight ? `${order.orderWeight} kg` : "N/G")}</b></p>
    </div></div>
    <section><p class="row"><span>NAME</span><b>${escape(order.customerName)}</b></p>
      <p class="row"><span>PHONE</span><b>${escape(order.phoneNumber)}</b></p>
      <p class="row"><span>ADDRESS</span><b>${escape(order.deliveryAddress || formatOrderAddress(order))}</b></p>
      ${area ? `<p class="row"><span>AREA</span><b>${escape(area)}</b></p>` : ""}
      ${steadfastAwb && order.shipping.note ? `<p class="row"><span>NOTE</span><i>${escape(order.shipping.note)}</i></p>` : ""}
    </section>
    <p class="cod"><span>CASH ON DELIVERY</span><b>৳ ${escape(order.shipping.cod ?? order.dueAmount ?? 0)}</b></p>
    <footer><span>Printed: ${escape(printedAt)}</span><b>✦ steadfast</b><small>steadfast.com.bd</small></footer>
    </main>`,
  `
    @page { size: 76.2mm 76.2mm; margin: 0; }
    body { width: 76.2mm; height: 76.2mm; padding: 0; font: 7pt Arial, sans-serif; color: #172033; overflow: hidden; }
    .label { width: 76.2mm; height: 76.2mm; padding: 1.5mm; display: grid; grid-template-rows: 10mm 11mm 18mm minmax(0,1fr) 7mm 5mm; }
    header { display: flex; align-items: center; gap: 2mm; border-bottom: .35mm solid #111; }
    .shop-logo { width: 9mm; height: 8mm; object-fit: contain; }
    .shop { margin-left: auto; text-align: right; }
    header h1 { font-size: 9pt; margin: 0 0 1mm; }
    header p { font-size: 6pt; margin: 0; }
    .barcode { text-align: center; border-bottom: .25mm solid #cbd5e1; }
    .barcode svg { display: block; width: 88%; height: 7mm; margin: 1mm auto 0; }
    .barcode path { fill: #000; }
    .barcode strong { font: bold 7pt monospace; letter-spacing: 1.5mm; }
    .shipment { display: flex; align-items: center; border-bottom: .25mm solid #cbd5e1; }
    .shipment img { width: 17mm; height: 17mm; padding-right: 1mm; border-right: .25mm solid #cbd5e1; }
    .details { flex: 1; padding-left: 2mm; }
    .details p, .row { display: flex; justify-content: space-between; gap: 1mm; margin: 0; }
    .details p { margin: .8mm 0; }
    .details span, .row span, .cod span { color: #526276; letter-spacing: .15mm; }
    .details b { text-align: right; }
    section { padding: 1mm; overflow: hidden; }
    .row { align-items: flex-start; margin-bottom: .7mm; line-height: 1.15; }
    .row span { width: 13mm; flex: 0 0 13mm; }
    .row b, .row i { flex: 1; overflow-wrap: anywhere; }
    .cod { display: flex; align-self: end; align-items: center; justify-content: space-between; border: .3mm solid #111; padding: 1mm 2mm; margin: 0; }
    .cod b { font-size: 11pt; }
    footer { grid-row: 6; display: flex; align-items: center; justify-content: space-between; border-top: .25mm solid #cbd5e1; color: #718096; font-size: 5.5pt; }
    footer b { color: #111; font-size: 7pt; }
  `);
}
