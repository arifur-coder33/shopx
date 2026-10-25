// import QRCode from "qrcode";

// export async function getInvoiceTemplate(orderData) {
//   // ১. QR কোড জেনারেট (Data URL)
//   const invoiceLink is built from the current request origin.
//   const qrCodeDataUrl = await QRCode.toDataURL(invoiceLink);

//   // লোগো URL (পূর্ণাঙ্গ URL হতে হবে অথবা Base64)
//   const logo URL is built from the current request origin.

//   // তারিখ ফরম্যাট
//   const dateOptions = { year: "numeric", month: "long", day: "numeric" };
//   const formattedDate = new Date(orderData.createdAt).toLocaleDateString(
//     "en-BD",
//     dateOptions
//   );

//   // ক্যালকুলেশন
//   const subTotal = orderData.orderItems.reduce(
//     (acc, item) => acc + item.price * item.quantity,
//     0
//   );
//   const total =
//     subTotal + (orderData.deliveryCharge || 0) + (orderData.tax || 0);

//   // আইটেম রো জেনারেট
//   const itemsHtml = orderData.orderItems
//     .map(
//       (item, index) => `
//     <tr class="border-b">
//         <td class="p-2 text-center">${index + 1}</td>
//         <td class="p-2">
//             <div class="font-bold">${item.productName}</div>
//             <div class="text-xs text-gray-500">
//                 ${
//                   item.combinations
//                     ? JSON.parse(item.combinations)
//                         .map((c) => `${c.name}: ${c.value}`)
//                         .join(", ")
//                     : ""
//                 }
//             </div>
//         </td>
//         <td class="p-2 text-center">${item.quantity}</td>
//         <td class="p-2 text-right">${item.price.toLocaleString("en-BD")}</td>
//         <td class="p-2 text-right">${(
//           item.price * item.quantity
//         ).toLocaleString("en-BD")}</td>
//     </tr>
//   `
//     )
//     .join("");

//   // ২. HTML রিটার্ন (Tailwind CSS CDN ব্যবহার করা সহজ উপায়)
//   return `
//     <!DOCTYPE html>
//     <html>
//     <head>
//         <meta charset="UTF-8">
//         <title>Invoice - ${orderData.orderNo}</title>
//         <script src="https://cdn.tailwindcss.com"></script>
//         <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
//         <style>
//             body { font-family: 'Hind Siliguri', sans-serif; }
//             .print-area { padding: 40px; max-width: 800px; margin: 0 auto; }
//         </style>
//     </head>
//     <body class="bg-white text-sm text-gray-800">
//         <div class="print-area">

//             <!-- Header -->
//             <div class="flex justify-between items-start mb-8">
//                 <div class="flex gap-4">
//                     <img src="${logoUrl}" class="w-16 h-16 object-contain" />
//                     <div>
//                         <h1 class="text-xl font-bold text-blue-600">BD Mart 24</h1>
//                         <p>Uttara Dhaka, Bangladesh</p>
//                         <p>Phone: +880 1XXXXXXXXX</p>
//                         <p>Email: hello@bdmart24.com</p>
//                     </div>
//                 </div>
//                 <div class="text-right">
//                     <h2 class="text-3xl font-bold text-gray-700 mb-2">INVOICE</h2>
//                     <p><strong>Invoice #:</strong> ${orderData.orderNo}</p>
//                     <p><strong>Date:</strong> ${formattedDate}</p>
//                     <p><strong>Due Date:</strong> ${
//                       orderData.dueDate || "N/A"
//                     }</p>
//                 </div>
//             </div>

//             <!-- Bill To / Ship To -->
//             <div class="flex justify-between gap-8 mb-8 border-t pt-4">
//                 <div class="w-1/2">
//                     <h3 class="font-bold text-blue-600 mb-2">BILL TO</h3>
//                     <p class="font-bold">${orderData.customerName}</p>
//                     <p>${orderData.deliveryAddress}</p>
//                     <p>${orderData.phoneNumber}</p>
//                     <p>${orderData.email}</p>
//                 </div>
//                 <div class="w-1/2">
//                     <h3 class="font-bold text-blue-600 mb-2">SHIP TO</h3>
//                     <p class="font-bold">${orderData.customerName}</p>
//                     <p>${orderData.deliveryAddress}</p>
//                     <p>${orderData.phoneNumber}</p>
//                 </div>
//             </div>

//             <!-- Table -->
//             <table class="w-full mb-8 border-collapse">
//                 <thead>
//                     <tr class="bg-blue-600 text-white">
//                         <th class="p-2 text-center w-10">#</th>
//                         <th class="p-2 text-left">Item & Description</th>
//                         <th class="p-2 text-center w-16">Qty</th>
//                         <th class="p-2 text-right w-24">Price</th>
//                         <th class="p-2 text-right w-24">Total</th>
//                     </tr>
//                 </thead>
//                 <tbody>
//                     ${itemsHtml}
//                 </tbody>
//             </table>

//             <!-- Totals -->
//             <div class="flex justify-end mb-12">
//                 <div class="w-64">
//                     <div class="flex justify-between mb-2">
//                         <span>Subtotal:</span>
//                         <span>${subTotal.toLocaleString("en-BD")} Tk</span>
//                     </div>
//                     ${
//                       orderData.deliveryCharge
//                         ? `
//                     <div class="flex justify-between mb-2">
//                         <span>Shipping:</span>
//                         <span>${orderData.deliveryCharge.toLocaleString(
//                           "en-BD"
//                         )} Tk</span>
//                     </div>`
//                         : ""
//                     }
//                      ${
//                        orderData.tax
//                          ? `
//                     <div class="flex justify-between mb-2">
//                         <span>Tax:</span>
//                         <span>${orderData.tax.toLocaleString("en-BD")} Tk</span>
//                     </div>`
//                          : ""
//                      }
//                     <div class="flex justify-between border-t border-gray-300 pt-2 font-bold text-blue-600 text-lg">
//                         <span>GRAND TOTAL:</span>
//                         <span>${total.toLocaleString("en-BD")} Tk</span>
//                     </div>
//                 </div>
//             </div>

//             <!-- Footer & QR -->
//             <div class="flex justify-between items-end mt-auto pt-8 border-t">
//                 <div class="text-xs text-gray-500 max-w-md">
//                     <p class="font-bold text-gray-700">Notes:</p>
//                     <p>${orderData.note || "Thanks for your business!"}</p>
//                     <p class="mt-2">Payment Method: ${
//                       orderData.paymentMethod
//                     }</p>
//                 </div>
//                 <div class="text-center">
//                     <img src="${qrCodeDataUrl}" class="w-20 h-20 mb-1" />
//                     <p class="text-[10px] text-gray-500">Scan to View Online</p>
//                 </div>
//             </div>

//             <div class="text-center text-xs text-gray-400 mt-8">
//                 Thank you for doing business with us. <br/> www.bdmart24.com
//             </div>
//         </div>
//     </body>
//     </html>
//   `;
// }
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { getSiteUrl } from "@/lib/siteUrl";

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

export async function getInvoiceTemplate(orderData) {
  const siteUrl = await getSiteUrl();
  // ১. QR কোড জেনারেট (Data URL)
  const invoiceLink = `${siteUrl}/api/pdf/invoice?o=${encodeURIComponent(orderData.orderNo)}&p=${encodeURIComponent(orderData.phoneNumber)}`;
  const qrCodeDataUrl = await QRCode.toDataURL(invoiceLink);

  // ২. লোকাল ফন্ট লোড করে Base64 এ কনভার্ট করা (দ্রুত লোডিংয়ের জন্য)
  let fontBase64 = "";
  try {
    // আপনার ফন্টের নাম অনুযায়ী ফাইলের নাম দিন (public/fonts ফোল্ডারে থাকতে হবে)
    const fontPath = path.join(
      process.cwd(),
      "public",
      "fonts",
      "SolaimanLipi.ttf",
    );
    if (fs.existsSync(fontPath)) {
      fontBase64 = fs.readFileSync(fontPath).toString("base64");
    }
  } catch (err) {
    console.error("Font loading failed", err);
  }

  // ৩. লোগো লোড করে Base64 এ কনভার্ট (নেটওয়ার্ক রিকোয়েস্ট এড়ানোর জন্য)
  let logoSrc = "";
  try {
    const logoPath = path.join(
      process.cwd(),
      "public",
      "android-chrome-192x192.png",
    );
    if (fs.existsSync(logoPath)) {
      const logoBase64 = fs.readFileSync(logoPath).toString("base64");
      logoSrc = `data:image/png;base64,${logoBase64}`;
    }
  } catch (err) {
    // ফলব্যাক যদি লোকাল লোগো না পাওয়া যায়
    logoSrc = `${siteUrl}/android-chrome-192x192.png`;
  }

  // ৪. তারিখ ফরম্যাট
  const dateOptions = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = new Date(orderData.createdAt).toLocaleDateString(
    "en-BD",
    dateOptions,
  );

  // ৫. ক্যালকুলেশন
  const subTotal = orderData.orderItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const total = orderData.dueAmount != null && Number.isFinite(Number(orderData.dueAmount))
    ? Number(orderData.dueAmount) + Number(orderData.paidAmount || 0)
    : subTotal + (orderData.deliveryCharge || 0) + (orderData.tax || 0);

  // ৬. আইটেম রো জেনারেট
  const itemsHtml = orderData.orderItems
    .map(
      (item, index) => `
    <tr>
        <td style="text-align: center;">${index + 1}</td>
        <td>
            <div class="item-name">${escapeHtml(item.productName)}</div>
            <div class="item-desc">
                ${
                  item.combinations
                    ? JSON.parse(item.combinations)
                        .map((c) => `${escapeHtml(c.name)}: ${escapeHtml(c.value)}`)
                        .join(", ")
                    : ""
                }
            </div>
        </td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${item.price.toLocaleString(
          "en-BD",
        )}</td>
        <td style="text-align: right;">${(
          item.price * item.quantity
        ).toLocaleString("en-BD")}</td>
    </tr>
  `,
    )
    .join("");

  // ৭. Plain CSS Styles
  const css = `
    @font-face {
        font-family: 'BanglaFont';
        src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
        font-weight: normal;
        font-style: normal;
    }
    body { font-family: 'BanglaFont', sans-serif; font-size: 14px; color: #333; margin: 0; padding: 0; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    
    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .company-info { display: flex; gap: 15px; }
    .logo { width: 60px; height: 60px; object-fit: contain; }
    .company-details h1 { color: #2563EB; margin: 0; font-size: 20px; font-weight: bold; }
    .company-details p { margin: 2px 0; font-size: 12px; }
    
    .invoice-details { text-align: right; }
    .invoice-title { font-size: 24px; font-weight: bold; color: #374151; margin-bottom: 5px; }
    .invoice-meta p { margin: 2px 0; font-size: 12px; }
    
    /* Bill To / Ship To */
    .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
    .address-col { width: 48%; }
    .col-title { color: #2563EB; font-weight: bold; margin-bottom: 5px; font-size: 13px; text-transform: uppercase; }
    .address-col p { margin: 2px 0; font-size: 13px; }
    .customer-name { font-weight: bold; }

    /* Table */
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background-color: #2563EB; color: white; padding: 8px; text-align: left; font-size: 13px; }
    td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .item-name { font-weight: bold; color: #1f2937; }
    .item-desc { font-size: 11px; color: #6b7280; margin-top: 2px; }

    /* Totals */
    .totals-area { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 250px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
    .grand-total { border-top: 1px solid #9ca3af; padding-top: 5px; margin-top: 5px; font-weight: bold; color: #2563EB; font-size: 16px; }

    /* Footer */
    .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e5e7eb; pt-4; margin-top: auto; }
    .notes { font-size: 12px; color: #6b7280; max-width: 60%; }
    .qr-area { text-align: center; }
    .qr-img { width: 80px; height: 80px; }
    .qr-text { font-size: 10px; color: #6b7280; margin-top: 2px; }
    .bottom-text { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 30px; }
  `;

  // ৮. HTML রিটার্ন
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Invoice - ${escapeHtml(orderData.orderNo)}</title>
        <style>${css}</style>
    </head>
    <body>
        <div class="container">
            
            <!-- Header -->
            <div class="header">
                <div class="company-info">
                    <img src="${logoSrc}" class="logo" />
                    <div class="company-details">
                        <h1>BD Mart 24</h1>
                        <p>Uttara Dhaka, Bangladesh</p>
                        <p>Phone: +880 1XXXXXXXXX</p>
                        <p>Email: hello@bdmart24.com</p>
                    </div>
                </div>
                <div class="invoice-details">
                    <div class="invoice-title">INVOICE</div>
                    <div class="invoice-meta">
                        <p><strong>Invoice #:</strong> ${escapeHtml(orderData.orderNo)}</p>
                        <p><strong>Date:</strong> ${formattedDate}</p>
                        <p><strong>Due Date:</strong> ${
                          escapeHtml(orderData.dueDate || "N/A")
                        }</p>
                    </div>
                </div>
            </div>

            <!-- Addresses -->
            <div class="addresses">
                <div class="address-col">
                    <div class="col-title">Bill To</div>
                    <p class="customer-name">${escapeHtml(orderData.customerName)}</p>
                    <p>${escapeHtml(orderData.deliveryAddress)}</p>
                    <p>${escapeHtml(orderData.phoneNumber)}</p>
                    <p>${escapeHtml(orderData.email)}</p>
                </div>
                <div class="address-col">
                    <div class="col-title">Ship To</div>
                    <p class="customer-name">${escapeHtml(orderData.customerName)}</p>
                    <p>${escapeHtml(orderData.deliveryAddress)}</p>
                    <p>${escapeHtml(orderData.phoneNumber)}</p>
                </div>
            </div>

            <!-- Table -->
            <table>
                <thead>
                    <tr>
                        <th style="text-align: center; width: 40px;">#</th>
                        <th>Item & Description</th>
                        <th style="text-align: center; width: 60px;">Qty</th>
                        <th style="text-align: right; width: 100px;">Price</th>
                        <th style="text-align: right; width: 100px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <!-- Totals -->
            <div class="totals-area">
                <div class="totals-table">
                    <div class="total-row">
                        <span>Subtotal:</span>
                        <span>${subTotal.toLocaleString("en-BD")} Tk</span>
                    </div>
                    ${orderData.cartDiscount ? `<div class="total-row"><span>Cart discount:</span><span>-${Number(orderData.cartDiscount).toLocaleString("en-BD")} Tk</span></div>` : ""}
                    ${orderData.paymentDiscount ? `<div class="total-row"><span>Payment discount:</span><span>-${Number(orderData.paymentDiscount).toLocaleString("en-BD")} Tk</span></div>` : ""}
                    ${
                      orderData.deliveryCharge
                        ? `
                    <div class="total-row">
                        <span>Shipping:</span>
                        <span>${orderData.deliveryCharge.toLocaleString(
                          "en-BD",
                        )} Tk</span>
                    </div>`
                        : ""
                    }
                    ${
                      orderData.tax
                        ? `
                    <div class="total-row">
                        <span>Tax:</span>
                        <span>${orderData.tax.toLocaleString("en-BD")} Tk</span>
                    </div>`
                        : ""
                    }
                    <div class="total-row grand-total">
                        <span>GRAND TOTAL:</span>
                        <span>${total.toLocaleString("en-BD")} Tk</span>
                    </div>
 <br/>
                       <div class="total-row ">
                        <span>Due:</span>
                        <span>${Number(orderData.dueAmount || 0).toLocaleString("en-BD")} Tk</span>
                    </div>
                </div>
            </div>

            <!-- Footer & QR -->
            <div class="footer">
                <div class="notes">
                    <p style="font-weight: bold; color: #374151; margin-bottom: 5px;">Notes:</p>
                    <p>${escapeHtml(orderData.note || "Thanks for your business!")}</p>
                    <p style="margin-top: 10px;"><strong>Payment Method:</strong> ${
                      escapeHtml(orderData.paymentMethod)
                    }
                      [${escapeHtml(orderData.paymentStatus)}]
                    </p>
                </div>
                <div class="qr-area">
                    <img src="${qrCodeDataUrl}" class="qr-img" />
                    <p class="qr-text">Scan to View Online</p>
                </div>
            </div>
            
            <div class="bottom-text">
                Thank you for doing business with us. <br/>${siteUrl}

            </div>
        </div>
    </body>
    </html>
  `;
}
