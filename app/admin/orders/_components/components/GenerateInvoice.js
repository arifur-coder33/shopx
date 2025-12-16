import { addSiyamrupaliFont } from "@/app/fonts/Siyamrupali-normal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode"; // ১. QR কোড লাইব্রেরি ইমপোর্ট করুন
const logoUrl = "/android-chrome-192x192.png"; // আপনার লোগোর পাথ
const order = {
  invoiceNumber: "INV-2025-0012",
  date: "2025-12-12",
  dueDate: "2026-01-12",
  company: {
    name: "BD Mart 24",
    address: "Uttara Dhaka, Bangladesh",
    phone: "+880 1XXXXXXXXX",
    email: "hello@bdmart24.com",
    website: "www.bdmart24.com",
  },
  billTo: {
    name: "Md. Rahim",
    address: "Uttara Dhaka, Bangladesh",
    phone: "+880 17XXXXXXXX",
    email: "rahim@example.com",
  },
  shipTo: {
    name: "Md. Karim (Ship To)",
    address: "Office 5B, Gulshan 1, Dhaka",
    phone: "+880 18XXXXXXXX",
    email: "karim.office@example.com",
  },
  items: [
    {
      name: "Paddy Cutter Machine",
      description: "Model: PDX-100, Color: Red",
      qty: 1,
      price: 42000,
    },
    {
      name: "High-Quality Engine Oil (5L)",
      description: "Synthetic Blend for better performance",
      qty: 2,
      price: 1500,
    },
    {
      name: "Delivery Charge",
      description: "Inside Dhaka",
      qty: 1,
      price: 500,
    },
  ],
  taxRate: 0.0,
  shipping: 0,
  notes:
    "Thanks for your business! All products come with a 1-year service warranty.",
  paymentMethod: "Cash on Delivery",
};

export async function generateInvoicePDF({ actionType, orderData }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  addSiyamrupaliFont(doc);
  doc.setFont("Siyamrupali");
  // --- সেটিংস ---
  const primaryColor = "#007BFF";
  const secondaryColor = "#343A40";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 15;
  const logoWidth = 22;
  const logoHeight = 22;
  const startY = 15;

  // --- লোগো লোড ফাংশন ---
  const addLogo = async () => {
    try {
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      return new Promise((resolve) => {
        reader.onload = function () {
          doc.addImage(
            reader.result,
            "PNG",
            marginX,
            startY,
            logoWidth,
            logoHeight
          );
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error loading logo:", error);
    }
  };

  // --- টাকার ফরম্যাট ---
  const fmt = (n) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
    }).format(n);

  // ====================================================================
  // --- ১. হেডার সেকশন ---
  // ====================================================================
  await addLogo();

  // কোম্পানির তথ্য (লোগোর ডানে)
  const companyInfoX = marginX + logoWidth + 5;
  let headerLeftY = startY + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.text(order.company.name, companyInfoX, headerLeftY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor);

  headerLeftY += 6;
  doc.text(order.company.address, companyInfoX, headerLeftY);
  headerLeftY += 4;
  doc.text(`Phone: ${order.company.phone}`, companyInfoX, headerLeftY);
  headerLeftY += 4;
  doc.text(`Email: ${order.company.email}`, companyInfoX, headerLeftY);
  headerLeftY += 4;
  doc.text(`Web: ${order.company.website}`, companyInfoX, headerLeftY);

  // ইনভয়েস তথ্য (ডানে)
  let headerRightY = startY + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("INVOICE", pageWidth - marginX, headerRightY, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  headerRightY += 10;

  doc.text("Invoice #:", pageWidth - 55, headerRightY, { align: "left" });
  doc.setFont("helvetica", "bold");
  doc.text(orderData.orderNo, pageWidth - marginX, headerRightY, {
    align: "right",
  });

  headerRightY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Date:", pageWidth - 55, headerRightY, { align: "left" });
  doc.setFont("helvetica", "bold");
  doc.text(
    new Date(orderData.createdAt).toLocaleDateString("en-BD"),
    pageWidth - marginX,
    headerRightY,
    {
      align: "right",
    }
  );

  headerRightY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Due Date:", pageWidth - 55, headerRightY, { align: "left" });
  doc.setFont("helvetica", "bold");
  doc.text(orderData?.dueDate || "", pageWidth - marginX, headerRightY, {
    align: "right",
  });

  let currentY = Math.max(headerLeftY, headerRightY) + 20;

  // ====================================================================
  // --- ২. Bill To & Ship To ---
  // ====================================================================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(primaryColor);
  doc.text("BILL TO", marginX, currentY);
  doc.text("SHIP TO", pageWidth / 2 + 5, currentY);

  doc.setDrawColor("#DDDDDD");
  doc.line(marginX, currentY + 2, pageWidth / 2 - 5, currentY + 2);
  doc.line(pageWidth / 2 + 5, currentY + 2, pageWidth - marginX, currentY + 2);

  currentY += 8;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(secondaryColor);

  // Bill To Content
  doc.setFont("helvetica", "bold");
  doc.text(orderData.customerName, marginX, currentY);
  doc.setFont("helvetica", "normal");
  const billLines = doc.splitTextToSize(orderData.deliveryAddress, 85);
  doc.text(billLines, marginX, currentY + 5);
  let billH = billLines.length * 5 + 5;
  doc.text(orderData.email, marginX, currentY + billH + 5);
  doc.text(orderData.phoneNumber, marginX, currentY + billH + 10);
  const totalBillH = billH + 15;

  // Ship To Content
  const ship = orderData || orderData.billTo;
  doc.setFont("helvetica", "bold");
  doc.text(ship.customerName, pageWidth / 2 + 5, currentY);
  doc.setFont("helvetica", "normal");
  const shipLines = doc.splitTextToSize(ship.deliveryAddress, 85);
  doc.text(shipLines, pageWidth / 2 + 5, currentY + 5);
  let shipH = shipLines.length * 5 + 5;
  doc.text(ship.phoneNumber, pageWidth / 2 + 5, currentY + shipH + 5);
  doc.text(ship.email, pageWidth / 2 + 5, currentY + shipH + 10);
  const totalShipH = shipH + 15;

  currentY += Math.max(totalBillH, totalShipH) + 10;

  // ====================================================================
  // --- ৩. টেবিল ---
  // ====================================================================
  const formatCombinations = (combinations) => {
    try {
      if (!combinations) return "";

      const parsed =
        typeof combinations === "string"
          ? JSON.parse(combinations)
          : combinations;

      if (!Array.isArray(parsed)) return "";

      return parsed.map((c) => `${c.name}: ${c.value}`).join(", ");
    } catch (e) {
      return "";
    }
  };
  const tableData = orderData.orderItems.map((item, index) => [
    index + 1,
    {
      content: `${item.productName}\n${
        formatCombinations(item.combinations) || ""
      }`,
      styles: { fontStyle: "normal", font: "Siyamrupali" },
    },
    item.quantity,
    fmt(item.price),
    { content: fmt(item.quantity * item.price), styles: { halign: "right" } },
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "#",
        "Item & Description",
        "Qty",
        "Price",
        { content: "Total", styles: { halign: "right" } },
      ],
    ],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold" },
    styles: {
      font: "Siyamrupali",
      fontSize: 9,
      overflow: "linebreak",
      cellPadding: 3,
    },
    headStyles: {
      font: "Siyamrupali",
      fillColor: primaryColor,
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "wrap" }, // Item & Description কলামকে wrap করতে দিন (সবচেয়ে গুরুত্বপূর্ণ)
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
    didDrawPage: (data) => (currentY = data.cursor.y + 10),
  });
  // ====================================================================
  // --- ৪. টোটাল হিসাব ---
  // ====================================================================

  const subTotal = orderData.orderItems.reduce(
    (s, i) => s + i.quantity * i.price,
    0
  );
  const total = subTotal + orderData?.deliveryCharge;
  const totalsXLabel = pageWidth - 70;
  const totalsXValue = pageWidth - marginX;

  doc.text("Subtotal:", totalsXLabel, currentY, { align: "right" });
  doc.text(fmt(subTotal), totalsXValue, currentY, { align: "right" });

  if (orderData?.taxRate > 0) {
    currentY += 6;
    doc.text(`Tax:`, totalsXLabel, currentY, { align: "right" });
    doc.text(fmt(subTotal * orderData?.taxRate), totalsXValue, currentY, {
      align: "right",
    });
  }
  if (orderData.deliveryCharge > 0) {
    currentY += 6;
    doc.text("Shipping:", totalsXLabel, currentY, { align: "right" });
    doc.text(fmt(orderData?.deliveryCharge), totalsXValue, currentY, {
      align: "right",
    });
  }

  currentY += 2;
  doc.line(totalsXLabel - 5, currentY, totalsXValue, currentY);
  currentY += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.text("GRAND TOTAL:", totalsXLabel, currentY, { align: "right" });
  doc.text(fmt(total), totalsXValue, currentY, { align: "right" });

  // ====================================================================
  // --- ৫. QR Code এবং ফুটার ---
  // ====================================================================

  // ইনভয়েসের লিংক তৈরি (উদাহরণস্বরূপ)
  const invoiceLink = `${process.env.NEXT_PUBLIC_SITE_URL}/${orderData.orderNo}`;

  // QR Code জেনারেট করা
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(invoiceLink, {
      errorCorrectionLevel: "M",
    });

    // QR Code এর অবস্থান: নিচের ডানদিকে (ফুটারের ঠিক উপরে)
    const qrSize = 25; // QR Code এর আকার (mm)
    const qrX = pageWidth - marginX - qrSize;
    const qrY = pageHeight - 45; // ফুটার লাইন থেকে একটু উপরে

    doc.addImage(qrCodeDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

    // QR Code এর নিচে ছোট টেক্সট
    doc.setFontSize(6);
    doc.setTextColor(secondaryColor);
    doc.text("Scan to View Online", qrX + qrSize / 2, qrY + qrSize + 3, {
      align: "center",
    });
  } catch (err) {
    console.error("QR Code generation failed", err);
  }

  // --- নোটস এবং পেমেন্ট ইনফো (বাম দিকে) ---
  let notesY = pageHeight - 50;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor);

  // পেমেন্ট মেথড
  if (orderData.paymentMethod) {
    doc.setFont("helvetica", "bold");
    doc.text("Payment Info:", marginX, notesY);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.paymentMethod, marginX + 25, notesY);
    notesY += 6;
  }

  // নোটস
  if (orderData.note) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", marginX, notesY);
    doc.setFont("helvetica", "normal");
    // QR Code এর সাথে যাতে ধাক্কা না লাগে তাই প্রস্থ একটু কমিয়ে দেওয়া হয়েছে
    const notesWidth = pageWidth - marginX - 50;
    doc.text(orderData.note, marginX, notesY + 5, { maxWidth: notesWidth });
  }

  // --- ফুটার লাইন ---
  const footerY = pageHeight - 15;
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.5);
  doc.line(0, footerY - 5, pageWidth, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor("#888888");
  doc.text("Thank you for doing business with us.", pageWidth / 2, footerY, {
    align: "center",
  });
  doc.text(order.company.website, pageWidth / 2, footerY + 4, {
    align: "center",
  });

  //   doc.save(`Invoice-${orderData.invoiceNumber}.pdf`);

  if (actionType == "view") {
    const pdfBlobUrl = doc.output("bloburl");

    // ২. নতুন ট্যাবে ওপেন করুন
    window.open(pdfBlobUrl, "_blank");
  } else {
    doc.save(`Invoice-${orderData.orderNo}.pdf`);
  }
}
