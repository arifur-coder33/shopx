import { sendTelegramMessage } from "./Telegram";


export async function notifyNewOrder(result) {
  // Base URL (use env variable in production)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Encode the phone number safely for URL
  const encodedPhone = encodeURIComponent(result?.phoneNumber || "");

  // Build tracking URL safely
  const orderUrl = `${baseUrl}/tracking/${result?.orderNo}?p=${encodedPhone}`;

  // Create Telegram message with HTML formatting
  const message = `
✅ <b>নতুন অর্ডার এসেছে!</b>
🆔 <b>Order No:</b> ${result?.orderNo}
📞 <b>ফোন:</b> ${result?.phoneNumber}
💰 <b>মূল্য:</b> ${result?.orderPrice}
🔗 <b> <a href="${orderUrl}">Order Tracking Link  </a> </b>

`;

  // Send to Telegram
  await sendTelegramMessage(message);
}
