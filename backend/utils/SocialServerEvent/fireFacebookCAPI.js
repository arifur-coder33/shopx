import { FB_MAP } from "@/lib/SocialEventTracking/facebook";
import { hash } from "@/lib/SocialEventTracking/hash";

export async function fireFacebookCAPI(data) {
  // 🔧 normalize helpers
  const normalizeEmail = (email) => email?.trim().toLowerCase();

  const fbdata = {
    event_name: FB_MAP[data.event] || data.event,
    event_time: data?.eventTime
      ? data?.eventTime
      : Math.floor(Date.now() / 1000),
    event_id: data.eventId,
    event_source_url: data.src,
    action_source: "website",

    user_data: {
      client_ip_address: data.user.ip,
      client_user_agent: data.user.agent,
      em: data.user.email ? [hash(normalizeEmail(data.user.email))] : undefined,
      ph: data.user.phone ? [hash(data.user.phone)] : undefined,
      fbc: data.user.fbc || undefined,
      fbp: data.user.fbp || undefined,

      external_id: data.user.userId
        ? hash(String(data.user.userId))
        : undefined,

      country: ["bd"], // optional but useful
    },

    custom_data: {
      value: data.value,
      currency: data.currency,

      content_type: "product",

      content_ids: data.items.map((i) => i.id),

      contents: data.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        item_price: i.price,
        title: i.name, // 🔥 added
      })),

      content_name:
        data.items.length > 1
          ? `${data.items.length} items`
          : data.items[0]?.name,

      content_category: data.items[0]?.category,

      num_items: data.items.reduce((a, b) => a + (b.quantity || 1), 0),
      ...(data.event === "search" && {
        search_string: data.extra?.search_string,
      }),
    },
  };
  console.log("fbdata", fbdata);
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [fbdata],
          access_token: process.env.FB_ACCESS_TOKEN,
          test_event_code:
            process.env.NODE_ENV === "development"
              ? process.env.FB_TEST_EVENT_CODE
              : undefined,
        }),
      },
    );

    const json = await res.json();

    // console.log("FB CAPI Response:", json);

    if (!res.ok) {
      // console.error("FB CAPI Error:", json);
    }
  } catch (err) {
    // console.error("FB CAPI Fetch Failed:", err);
  }
}
