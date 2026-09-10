import { sendTelegramMessage } from "./Telegram";
import { getSiteUrl } from "@/lib/siteUrl";


export async function notifyNewOrder(result) {
  const baseUrl = await getSiteUrl();

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
