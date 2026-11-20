import { getInvoiceTemplate } from "@/backend/lib/pdf/InvoiceTemplate";
import { renderOrderPdf } from "@/backend/lib/pdf/invoiceGenerate";
import { getAwbTemplate, getPackingListTemplate } from "@/backend/lib/pdf/orderDocumentTemplates";
import { hasPermission } from "@/backend/utils/hasPermission";
import { getInvoiceCompanySettings } from "@/backend/serverActions/siteSettingAction";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request) {
  try {
    await hasPermission("order", "view");
  } catch {
    return Response.json({ error: "Access denied" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const orderId = params.get("id") || "";
  const document = params.get("document") || "invoice";
  if (!orderId || orderId.length > 64 || !["invoice", "packing-list", "awb"].includes(document)) {
    return Response.json({ error: "Invalid document request" }, { status: 400 });
  }

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { orderBy: { orderItemNo: "asc" }, select: { productName: true, sku: true, quantity: true, price: true, combinations: true } },
        shipping: { select: { cn: true, cod: true, note: true, courierName: true, courierProvider: { select: { adapterKey: true, nonSecretConfig: true } } } },
        selectedCourierProvider: { select: { name: true } },
      },
    });
    if (!order || (document === "awb" && !order.shipping?.cn)) {
      return Response.json({ error: "Document not found" }, { status: 404 });
    }

    const company = await getInvoiceCompanySettings();
    const siteIdentity = document === "awb"
      ? await prisma.siteSetting.findFirst({ select: { name: true } })
      : null;
    let html;
    let pdfOptions;
    if (document === "awb") {
      html = await getAwbTemplate(order, siteIdentity?.name || company.name, company.photoDataUrl, order.shipping.courierProvider?.nonSecretConfig?.merchantId);
      pdfOptions = { preferCSSPageSize: true, margin: { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" } };
    } else if (document === "packing-list") {
      html = getPackingListTemplate(order, company.name);
      pdfOptions = { margin: { top: "10mm", bottom: "10mm", left: "12mm", right: "12mm" } };
    } else {
      html = await getInvoiceTemplate({ ...order, tax: order.taxAmount || 0, invoiceCompany: company });
    }

    const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
    try {
      const pdf = await renderOrderPdf(html, pdfOptions);
      const orderNo = order.orderNo.replace(/[^a-zA-Z0-9_-]/g, "_");
      const disposition = params.get("download") === "1" ? "attachment" : "inline";
      return new Response(pdf, { headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${document}-${orderNo}.pdf"`,
      } });
    } catch (error) {
      console.error("Order PDF unavailable; rendering printable document:", error.message);
      const controls = '<style>@media print{.document-print{display:none}}.document-print{display:block;margin:12px auto;padding:8px 16px;cursor:pointer}</style><button class="document-print" onclick="window.print()">Print / Save PDF</button>';
      return new Response(html.replace("</body>", `${controls}</body>`), {
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch (error) {
    console.error("Order document generation failed:", error.message);
    return Response.json({ error: "Failed to generate order document" }, { status: 500 });
  }
}
