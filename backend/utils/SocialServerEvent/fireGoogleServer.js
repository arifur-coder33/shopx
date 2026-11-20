import { GOOGLE_MAP } from "@/lib/SocialEventTracking/google";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

export async function fireGoogleServer(data, configuredSettings) {
  const settings =
    configuredSettings || (await getServerSocialTrackingSettings());
  if (!settings.googleAnalyticsId || !settings.googleAnalyticsSecret) {
    return { skipped: true, reason: "Google server tracking is not configured." };
  }
  const client_id = (data.event === "user_engagement" && data.extra.clientId) || data.user.gaClientId || `${Date.now()}.${Math.random()}`;

  const payload = {
    client_id,

    user_properties: {
      country: { value: "BD" },
    },

    events: [
      {
        name: GOOGLE_MAP[data.event] || data.event,

        params: data.event === "user_engagement" ? {
          session_id: data.extra.sessionId,
          engagement_time_msec: data.extra.engagementTimeMsec,
        } : {
          value: data.value,
          currency: data.currency,
          transaction_id: data.transactionId || data.eventId,
          source: data.actionSource || "website",
          ...(Number.isFinite(Number(data.shipping)) && {
            shipping: Number(data.shipping),
          }),

          items: data.items.map((i) => ({
            item_id: i.id,
            item_name: i.name,
            ...(i.category && { item_category: i.category }),
            price: i.price,
            quantity: i.quantity,
          })),

          event_id: data.eventId,
        },
      },
    ],
  };
  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(settings.googleAnalyticsId)}&api_secret=${encodeURIComponent(settings.googleAnalyticsSecret)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return { success: response.ok };
}
