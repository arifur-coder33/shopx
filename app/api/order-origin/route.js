import {
  saveBrowserOrderOrigin,
  verifyOrderOriginCapability,
} from "@/backend/services/orderGeoService";

export const runtime = "nodejs";

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return Response.json({ success: false }, { status: 403 });
      }
    } catch {
      return Response.json({ success: false }, { status: 403 });
    }
  }

  try {
    const { capability, latitude, longitude, accuracy } = await request.json();
    const orderId = String(capability || "").split(".", 1)[0];
    if (!verifyOrderOriginCapability(orderId, capability)) {
      return Response.json({ success: false }, { status: 403 });
    }
    const saved = await saveBrowserOrderOrigin({
      orderId,
      latitude,
      longitude,
      accuracy,
    });
    return Response.json({ success: saved }, { status: saved ? 200 : 400 });
  } catch {
    return Response.json({ success: false }, { status: 400 });
  }
}
