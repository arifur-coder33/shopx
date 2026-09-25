"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// App Router navigations do not reload the pixel scripts, so send a page view
// for client-side route changes as well as the initial layout PageView.
export default function RouteViewTracker() {
  const pathname = usePathname();
  const firstPath = useRef(true);

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
