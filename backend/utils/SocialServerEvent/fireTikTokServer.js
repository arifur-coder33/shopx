async function fireTikTokServer(data) {
  await fetch("https://business-api.tiktok.com/open_api/v1.3/event/track/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Token": process.env.TT_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      pixel_code: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,
      event: "CompletePayment",
      event_id: data.eventId,

      context: {
        ip: data.user.ip,
        user_agent: data.user.agent,

        ad: {
          callback: data.user.ttclid,
        },
      },

      properties: {
        value: data.value,
        currency: data.currency,
        contents: data.items.map((i) => ({
          content_id: i.id,
          quantity: i.quantity,
          price: i.price,
        })),
        content_type: "product",
      },
    }),
  });
}
