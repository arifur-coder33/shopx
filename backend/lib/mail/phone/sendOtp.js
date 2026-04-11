"use server";

export async function sendOTP({ phone, message }) {
  try {
    const res = await fetch("https://smsplus.sslwireless.com/api/v3/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_token: process.env.SSL_SMS_TOKEN,
        sid: process.env.SSL_SMS_SID,
        msisdn: phone,
        sms: message,
        csms_id: "123456",
      }),
    });

    const data = await res.json();

    return { success: true, data };
  } catch (error) {
    console.error("OTP Error:", error);
    return { success: false };
  }
}
