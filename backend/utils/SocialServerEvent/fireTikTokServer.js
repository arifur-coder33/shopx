import { TT_MAP } from "@/lib/SocialEventTracking/tiktok";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

export async function fireTikTokServer(data, configuredSettings) {
  const settings =
    configuredSettings || (await getServerSocialTrackingSettings());
  if (!settings.tiktokPixelId || !settings.tiktokAccessToken) {
    return { skipped: true, reason: "TikTok server tracking is not configured." };
  }
  const payload = {
    pixel_code: settings.tiktokPixelId,

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

  const res = await fetch(
    "https://business-api.tiktok.com/open_api/v1.3/event/track/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Token": settings.tiktokAccessToken,
      },
      body: JSON.stringify(payload),
    },
  );

  const json = await res.json();

  if (!res.ok) {
    // console.error("TikTok CAPI Error:", json);
  }
  return { success: res.ok, data: json };
}
