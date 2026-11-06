import { getInvoiceTemplate } from "@/backend/lib/pdf/InvoiceTemplate";
import { getInvoicePDF } from "@/backend/lib/pdf/invoiceGenerate";
import prisma from "@/lib/prisma";
import { getInvoiceCompanySettings } from "@/backend/serverActions/siteSettingAction";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const orderNo = String(params.get("o") || "").trim().slice(0, 40);
  const phone = String(params.get("p") || "").replace(/\D/gu, "").slice(0, 20);
  if (!orderNo || phone.length < 7) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  try {
    const order = await prisma.order.findUnique({
      where: { orderNo },
      select: {
        orderNo: true, customerName: true, phoneNumber: true, email: true, deliveryAddress: true,
        deliveryCharge: true, taxAmount: true, orderPrice: true, dueAmount: true, paidAmount: true, cartDiscount: true, paymentDiscount: true, paymentMethod: true, paymentStatus: true,
        note: true, createdAt: true,
        orderItems: { select: { productName: true, quantity: true, price: true, combinations: true } },
      },
    });
    const savedPhone = String(order?.phoneNumber || "").replace(/\D/gu, "");
    if (!order || savedPhone.length < 7 || savedPhone !== phone) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const invoiceCompany = await getInvoiceCompanySettings();
    let pdf;
    try {
      pdf = await getInvoicePDF({ ...order, tax: order.taxAmount || 0, invoiceCompany });
    } catch (error) {
      // Keep the verified invoice readable if the PDF browser cannot start.
      console.error("Invoice PDF unavailable; rendering printable invoice:", error?.message);
      const html = await getInvoiceTemplate({ ...order, tax: order.taxAmount || 0, invoiceCompany });
      const controls = '<style>@media print{.invoice-print{display:none}}.invoice-print{display:block;margin:16px auto;padding:12px 24px;cursor:pointer}</style><button class="invoice-print" onclick="window.print()">Print / Save PDF</button>';
      return new NextResponse(html.replace('</body>', `${controls}</body>`), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
      });
    }
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=invoice-${order.orderNo}.pdf`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Verified invoice generation failed:", error?.message || error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { orderData } = await req.json();

    if (!orderData) {
      return NextResponse.json(
        { error: "No order data provided" },
        { status: 400 }
      );
    }

    const pdfBuffer = await getInvoicePDF(orderData);

    // রেসপন্স হেডার সেট করা যাতে ব্রাউজার পিডিএফ ডাউনলোড/শো করে
    const response = new NextResponse(pdfBuffer);
    response.headers.set("Content-Type", "application/pdf");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename=invoice-${orderData.orderNo}.pdf`
    );

    return response;
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
