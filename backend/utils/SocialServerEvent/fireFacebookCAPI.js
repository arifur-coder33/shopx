async function fireFacebookCAPI(data) {
  await fetch(
    `https://graph.facebook.com/v18.0/${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [
          {
            event_name: "Purchase",
            event_time: Math.floor(Date.now() / 1000),
            event_id: data.eventId,
            action_source: "website",

            user_data: {
              em: data.user.email ? [hash(data.user.email)] : undefined,
              ph: data.user.phone ? [hash(data.user.phone)] : undefined,
              client_ip_address: data.user.ip,
              client_user_agent: data.user.agent,
              fbp: data.user.fbp,
              fbc: data.user.fbc,
            },

            custom_data: {
              value: data.value,
              currency: data.currency,
              content_ids: data.items.map((i) => i.id),
              contents: data.items.map((i) => ({
                id: i.id,
                quantity: i.quantity,
                item_price: i.price,
              })),
            },
          },
        ],
        access_token: process.env.FB_ACCESS_TOKEN,
      }),
    },
  );
}
