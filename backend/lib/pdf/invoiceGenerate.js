import { getInvoiceTemplate } from "@/backend/lib/pdf/InvoiceTemplate";
import { launchChatBrowser } from "@/backend/services/chatBrowser";

export async function getInvoicePDF(orderData) {
  if (!orderData) {
    throw new Error("No order data provided");
  }

  return renderOrderPdf(await getInvoiceTemplate(orderData));
}

export async function renderOrderPdf(html, options = {}) {
  const browser = await launchChatBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm" },
      ...options,
    });
  } finally {
    await browser.close();
  }
}
