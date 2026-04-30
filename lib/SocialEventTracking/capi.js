export function fireCAPI(payload) {
  if (typeof window === "undefined") return;

  navigator.sendBeacon("/api/social-event/capi", JSON.stringify(payload));
}
