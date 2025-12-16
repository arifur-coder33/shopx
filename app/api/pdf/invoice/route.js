import { getInvoiceTemplate } from "@/backend/lib/pdf/InvoiceTemplate";
import chromium from "@sparticuz/chromium";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";

// লোকাল ডেভেলপমেন্টের জন্য Chromium পাথ সেটআপ (Windows/Mac এর জন্য ভিন্ন হতে পারে)
// সাধারণত লোকাল টেস্ট এর জন্য 'puppeteer' প্যাকেজ ব্যবহার করা ভালো,
// আর প্রোডাকশনের জন্য 'puppeteer-core' + '@sparticuz/chromium'
const getBrowser = async () => {
  if (process.env.NODE_ENV === "production") {
    // Vercel / Production environment
    return await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
  } else {
    // Local development (requires full 'puppeteer' package installed or path to chrome)
    // Dev এর জন্য সহজ সমাধান: npm install puppeteer --save-dev
    const puppeteerLocal = require("puppeteer");
    return await puppeteerLocal.launch({
      headless: "new",
    });
  }
};

export async function POST(req) {
  try {
    const { orderData } = await req.json();

    if (!orderData) {
      return NextResponse.json(
        { error: "No order data provided" },
        { status: 400 }
      );
    }

    const htmlContent = await getInvoiceTemplate(orderData);
    const browser = await getBrowser();
    const page = await browser.newPage();

    // HTML সেট করা
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // PDF জেনারেট করা
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true, // ব্যাকগ্রাউন্ড কালার প্রিন্ট করার জন্য
      margin: { top: "10mm", bottom: "10mm" }, // মার্জিন
    });

    // await browser.close();

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
