import { getIP } from "@/backend/utils/getIp";
import { getCookie } from "@/utils/getCookie";
import { headers } from "next/headers";
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
      ip: getIP(headers),
    },
    extra,
  };

  navigator.sendBeacon("/api/capi", JSON.stringify(payload));
}
