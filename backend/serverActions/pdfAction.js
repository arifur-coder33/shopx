"use server";

import { getInvoicePDF } from "@/backend/lib/pdf/invoiceGenerate"; // আপনার আগের অপ্টিমাইজ করা ফাংশনটি

export async function generateInvoiceAction(orderData) {
  try {
    // ১. PDF বাফার জেনারেট করা
    const pdfBuffer = await getInvoicePDF(orderData);

    // ২. বাফারকে Base64 স্ট্রিং-এ কনভার্ট করা (ক্লায়েন্টে পাঠানোর জন্য)
    const base64String = pdfBuffer.toString("base64");

    return { success: true, data: base64String };
  } catch (error) {
    console.error("Server Action Error:", error);
    return { success: false, error: "Failed to generate PDF" };
  }
}
