import { getIP } from "@/backend/utils/getIp";
import { fireFacebookCAPI } from "@/backend/utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "@/backend/utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "@/backend/utils/SocialServerEvent/fireTikTokServer";
import { headers } from "next/headers";
import { getServerSocialTrackingSettings } from "@/backend/services/socialTrackingService";

export async function POST(req) {
  try {
    const h = await headers();
    const ip = getIP(h);
    const body = await req.json();
    if (String(body?.event).toLowerCase() === "purchase") {
      return Response.json({ success: false }, { status: 403 });
    }

    if (body?.event === "user_engagement") {
      const origin = req.headers.get("origin");
      if (!origin || new URL(origin).host !== h.get("host")) {
        return Response.json({ success: false }, { status: 403 });
      }
      const { clientId, sessionId, engagementTimeMsec } = body.extra || {};
      if (typeof clientId !== "string" || !/^\d{1,20}\.\d{1,20}$/.test(clientId)
          || !Number.isSafeInteger(sessionId) || sessionId <= 0 || engagementTimeMsec !== 2500) {
        return Response.json({ success: false }, { status: 400 });
      }
      const result = await fireGoogleServer({
        event: "user_engagement", eventId: body.eventId, user: {}, items: [],
        extra: { clientId, sessionId, engagementTimeMsec },
      });
      return Response.json({ success: true, providers: { ga4: result.success ? "submitted" : result.skipped ? "skipped" : "failed" } });
    }

    const user = body.user || {};
    const items = body.items || [];
    const extra = body.extra || {};

    const userAgent = h.get("user-agent");

    const payload = {
      event: body.event,
      eventId: body.eventId,
      value: body.value,
      currency: "BDT",
      src: body.src,
      actionSource: body.actionSource,
      extra,
      items: items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.productName,
        category: item.category,
      })),

      user: {
        email: user.email,
        phone: user.phone || user.phoneNumber,
        userId: user.userId,
        fbp: user.fbp,
        fbc: user.fbc,
        gclid: user.gclid,
        ttclid: user.ttclid,
        ip: ip,
        agent: userAgent,
      },
    };

    // console.log("route", payload);
    const trackingSettings = await getServerSocialTrackingSettings();
    const results = await Promise.allSettled([
      fireFacebookCAPI(payload, trackingSettings),
      fireGoogleServer(payload, trackingSettings),
      fireTikTokServer(payload, trackingSettings),
    ]);

    const providers = Object.fromEntries(["meta", "ga4", "tiktok"].map((provider, index) => {
      const result = results[index];
      const status = result.status === "fulfilled" && result.value?.skipped ? "skipped"
        : result.status === "fulfilled" && result.value?.success ? "submitted" : "failed";
      if (status === "failed") console.warn("Tracking provider failed:", provider, payload.eventId);
      return [provider, status];
    }));
    return Response.json({ success: true, eventId: payload.eventId, providers });
  } catch (error) {
    console.error("CAPI Error:", error);
    return Response.json({ success: false });
  }
}
