async function fireGoogleServer(data) {
  if (!data.user.gclid) return; // optional

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}&api_secret=${process.env.GOOGLE_ANALYTICS_SECRET}`,
    {
      method: "POST",
      body: JSON.stringify({
        client_id: data.user.gclid || "server",
        events: [
          {
            name: "purchase",
            params: {
              value: data.value,
              currency: data.currency,
              items: data.items.map((i) => ({
                item_id: i.id,
                item_name: i.name,
                price: i.price,
                quantity: i.quantity,
              })),
            },
          },
        ],
      }),
    },
  );
}
