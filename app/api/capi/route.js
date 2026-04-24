import { FB_MAP } from "@/lib/SocialEventTracking/facebook";
import { hash } from "@/lib/SocialEventTracking/hash";

export async function POST(req) {
  try {
    const body = await req.json();

    const user = body.user || {};
    const items = body.items || [];
    const extra = body.extra || {};

    const payload = {
      data: [
        {
          event_name: FB_MAP[body.event] || body.event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: body.eventId,
          action_source: "website",

          // 🔥 USER DATA (server trusted layer)
          user_data: {
            em: user.email ? [hash(user.email)] : undefined,
            ph: user.phone ? [hash(user.phone)] : undefined,
            client_user_agent: user.agent || "",
            fbp: user.fbp || undefined,
            fbc: user.fbc || undefined,
          },

          // 🔥 PRODUCT / EVENT DATA
          custom_data: {
            value: body.value,
            currency: body.currency,

            content_ids: items.map((i) => i.id),

            contents: items.map((i) => ({
              id: i.id,
              quantity: i.quantity,
              item_price: i.price,
            })),

            num_items: items.reduce((a, b) => a + (b.quantity || 1), 0),
            ...(body.event === "search" && {
              search_string: extra.search_string,
            }),
          },
        },
      ],
    };

    await fetch(
      `https://graph.facebook.com/v18.0/${process.env.FB_PIXEL_ID}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error("CAPI Error:", error);
    return Response.json({ success: false });
  }
}
