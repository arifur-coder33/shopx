import { getIP } from "@/backend/utils/getIp";
import { fireFacebookCAPI } from "@/backend/utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "@/backend/utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "@/backend/utils/SocialServerEvent/fireTikTokServer";
import { headers } from "next/headers";

export async function POST(req) {
  try {
    const h = await headers();
    const ip = getIP(h);
    const body = await req.json();

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
        phone: user.phoneNumber,
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
    await Promise.all([
      fireFacebookCAPI(payload),
      fireGoogleServer(payload),
      fireTikTokServer(payload),
    ]);

    // await fetch(
    //   `https://graph.facebook.com/v18.0/${process.env.FB_PIXEL_ID}/events`,
    //   {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(payload),
    //   },
    // );

    return Response.json({ success: true });
  } catch (error) {
    console.error("CAPI Error:", error);
    return Response.json({ success: false });
  }
}
