import { TT_MAP } from "@/lib/SocialEventTracking/tiktok";

export async function fireTikTokServer(data) {
  const payload = {
    pixel_code: process.env.TT_PIXEL_ID,

    event: TT_MAP[data.event] || data.event,

    event_id: data.eventId,

    context: {
      ip: data.user.ip,
      user_agent: data.user.agent,

      ad: {
        callback: data.user.ttclid || undefined,
      },
    },

    properties: {
      value: data.value,
      currency: data.currency,

      content_type: "product",

      contents: data.items.map((i) => ({
        content_id: i.id,
        quantity: i.quantity,
        price: i.price,
        content_name: i.name,
      })),
    },
  };

  console.log("tt payload", payload.properties.contents);
  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": process.env.TT_ACCESS_TOKEN,
      },
      body: JSON.stringify(payload),
    },
  );

  const json = await res.json();

  if (!res.ok) {
    // console.error("TikTok CAPI Error:", json);
  }
}
