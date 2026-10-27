import { getInvoiceTemplate } from "@/backend/lib/pdf/InvoiceTemplate";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

// ব্রাউজার সেটআপ ফাংশন (এটা বাইরে রাখলে ভালো)
const getBrowser = async () => {
  if (process.env.NODE_ENV === "production") {
    // Vercel / Production environment
    return await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Local development
    const { default: puppeteerLocal } = await import("puppeteer");
    return await puppeteerLocal.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
};

export async function getInvoicePDF(orderData) {
  if (!orderData) {
    throw new Error("No order data provided");
  }

  let browser = null;
  try {
    const htmlContent = await getInvoiceTemplate(orderData);

    // ১. ব্রাউজার লঞ্চ
    browser = await getBrowser();
    const page = await browser.newPage();

    // ২. ফাস্ট রেন্ডারিং (যেহেতু সব ইনলাইন, তাই domcontentloaded যথেষ্ট)
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    await page.evaluate(() => document.fonts.ready);

    // ৩. PDF জেনারেট
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm" },
    });

    // ৪. পেজ ক্লোজ করা (ব্রাউজার ক্লোজ করার আগে)
    await page.close();

    return pdfBuffer; // বাফার রিটার্ন করছি, রেসপন্স না
  } catch (error) {
    console.error("PDF Gen Error:", error);
    throw error;
  } finally {
    // ৫. এটি সবচেয়ে জরুরি: কাজ শেষ বা এরর হলেও ব্রাউজার বন্ধ করতে হবে
    if (browser) {
      await browser.close();
    }
  }
}
