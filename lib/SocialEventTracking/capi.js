
import { getCookie } from "@/utils/getCookie";

export function fireCAPI(
  event,
  value,
  currency,
  items,
  eventId,
  user = {},
  extra = {},
) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    value,
    currency,
    items,
    eventId,

    user: {
      email: user.email,
      phone: user.phone,
      agent: navigator.userAgent,
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
    
    },
    extra,
  };

  navigator.sendBeacon("/api/social-event/capi", JSON.stringify(payload));
}
