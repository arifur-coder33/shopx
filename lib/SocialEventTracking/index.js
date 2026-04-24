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
}) => {
  const eventId = generateEventId();

  // ⚡ non-blocking execution
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
