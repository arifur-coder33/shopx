import { getCookie, setCookie } from "./cooike";

export function initTrackingCooike() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);

  // 🔵 Google
  const gclid = url.searchParams.get("gclid");
  if (gclid) setCookie("gclid", gclid);

  // 🔴 TikTok
  const ttclid = url.searchParams.get("ttclid");
  if (ttclid) setCookie("ttclid", ttclid);

  // 🔵 Facebook click id
  const fbclid = url.searchParams.get("fbclid");
  if (fbclid) setCookie("fbclid", fbclid);

  // 🔥 Facebook browser id (fbp)
  const fbp = getCookie("_fbp");
  if (fbp) setCookie("fbp", fbp);

  // 🔥 Facebook click id fallback
  const fbc = getCookie("_fbc");
  if (fbc) setCookie("fbc", fbc);
}
