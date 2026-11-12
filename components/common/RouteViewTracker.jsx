"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { fireCAPI } from "@/lib/SocialEventTracking/capi";

// App Router navigations do not reload the pixel scripts, so send a page view
// for client-side route changes as well as the initial layout PageView.
export default function RouteViewTracker() {
  const pathname = usePathname();
  const firstPath = useRef(true);

  useEffect(() => {
    let timer;
    function scheduleEngagement() {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      timer = window.setTimeout(async () => {
        try {
          const now = Date.now();
          const key = "storefront-ga-engagement";
          const previous = JSON.parse(sessionStorage.getItem(key) || "null");
          if (previous?.sentAt && now - previous.sentAt < 25 * 60 * 1000) return;
          const gaCookie = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/)?.[1];
          const clientId = gaCookie || previous?.clientId || (Math.floor(Math.random() * 1e9) + "." + Math.floor(now / 1000));
          const sessionId = Math.floor(now / 1000);
          sessionStorage.setItem(key, JSON.stringify({ clientId, sentAt: now }));
          try {
            const receipt = await fireCAPI({
              event: "user_engagement",
              eventId: "engagement_" + clientId + "_" + sessionId,
              extra: { clientId, sessionId, engagementTimeMsec: 2500 },
            });
            if (receipt?.providers?.ga4 !== "submitted") sessionStorage.removeItem(key);
          } catch {
            sessionStorage.removeItem(key);
          }
        } catch {
          // Storage access can be unavailable in restricted browsers.
        }
      }, 2500);
    }
    scheduleEngagement();
    document.addEventListener("visibilitychange", scheduleEngagement);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", scheduleEngagement);
    };
  }, [pathname]);

  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }
    const pagePath = `${pathname || "/"}${window.location.search}`;
    if (window.fbq) window.fbq("track", "PageView");
    if (window.gtag) window.gtag("event", "page_view", { page_path: pagePath });
    if (window.ttq?.page) window.ttq.page();
  }, [pathname]);

  return null;
}
