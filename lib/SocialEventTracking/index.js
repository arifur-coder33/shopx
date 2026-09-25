import { getCookie } from "@/utils/cookie/cooike";
import { normalizePhone } from "@/utils/normalize";
import { fireCAPI } from "./capi";
import { generateEventId } from "./eventId";
import { fireFacebook } from "./facebook";
import { fireGoogle } from "./google";
import { fireTikTok } from "./tiktok";
export const trackEvent = ({
  event,
  value = 0,
  currency = "BDT",
  items = [],
  extra = {},
  user = {},
  src,
}) => {
  const eventId = generateEventId();

  const payload = {
    event: event,
    eventId,
    value: value,
    currency: "BDT",
    src: src
      ? new URL(src, window.location.origin).toString()
      : window.location.href,
    items: items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      price: item.price,
      productName: item.productName,
      category: item.category,
    })),

    user: {
      email: user.email,
      phone: normalizePhone(user.phoneNumber),
      userId: user.userId,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      gclid: getCookie("gclid"),
      ttclid: getCookie("ttclid"),
      agent: navigator.userAgent,
    },
    extra: extra,
  };

  queueMicrotask(() => {
    try {
      fireFacebook(event, value, currency, items, eventId, extra);
      fireGoogle(event, value, currency, items, extra);
      fireTikTok(event, value, currency, items, extra);
      fireCAPI(payload);
    } catch (err) {
      console.error("Tracking error:", err);
    }
  });
};
