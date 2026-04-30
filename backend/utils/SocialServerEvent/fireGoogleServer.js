import { GOOGLE_MAP } from "@/lib/SocialEventTracking/google";

export async function fireGoogleServer(data) {
  const client_id = data.user.gclid || `${Date.now()}.${Math.random()}`;

  const payload = {
    client_id,

    user_properties: {
      country: { value: "BD" },
    },

    events: [
      {
        name: GOOGLE_MAP[data.event] || data.event,

        params: {
          value: data.value,
          currency: data.currency,

          items: data.items.map((i) => ({
            item_id: i.id,
            item_name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),

          event_id: data.eventId,
        },
      },
    ],
  };
  console.log("google payload", payload);
  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}&api_secret=${process.env.GOOGLE_ANALYTICS_SECRET}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
