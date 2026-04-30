import { getCookie } from "@/utils/cookie/cooike";
import { fireCAPI } from "./capi";
import { generateEventId } from "./eventId";
import { fireFacebook } from "./facebook";
import { fireGoogle } from "./google";
import { fireTikTok } from "./tiktok";
import { fireFacebookCAPI } from "@/backend/utils/SocialServerEvent/fireFacebookCAPI";
import { fireGoogleServer } from "@/backend/utils/SocialServerEvent/fireGoogleServer";
import { fireTikTokServer } from "@/backend/utils/SocialServerEvent/fireTikTokServer";
export const trackEvent = ({
  event,
  value = 0,
  currency = "BDT",
  items = [],
  extra = {},
  user = {},
}) => {
  const eventId = generateEventId();
  console.log("Tracking event:", {
    event,
    value,
    currency,
    items,
    extra,
    user,
  });
  // ⚡ non-blocking execution

      const payload = {
      event: event,
      eventId,
      value: value,
      currency: "BDT",

      items:items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.productName,
        category:item.category,
      })),

      user: {
        email: user.email,
        phone: user.phoneNumber,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        gclid: getCookie("gclid"),
        ttclid: getCookie("ttclid"),
        agent: navigator.userAgent,
      },
    };

  queueMicrotask(() => {
    try {
      fireFacebook(event, value, currency, items, eventId, extra);
      fireGoogle(event, value, currency, items, extra);
      fireTikTok(event, value, currency, items, extra);
      fireCAPI(event, value, currency, items, eventId, user, extra);

    } catch (err) {
      console.error("Tracking error:", err);
    }
  });
};
