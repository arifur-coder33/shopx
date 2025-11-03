export async function sendTelegramMessage(message) {
  try {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      throw new Error("Missing TELEGRAM_TOKEN or TELEGRAM_CHAT_ID.");
    }

    // ✅ Correct Telegram API endpoint
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Telegram API error: ${errorText}`);
    }

    console.log("✅ Telegram message sent successfully!");
  } catch (err) {
    console.error("❌ Telegram message error:", err.message);
  }
}
