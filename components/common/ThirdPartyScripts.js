// src/components/ThirdPartyScripts.js

"use client";

import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { useEffect, useState } from "react";

export default function ThirdPartyScripts() {
  const [loadScripts, setLoadScripts] = useState(false);

  useEffect(() => {
    // Define a function to trigger script loading
    const triggerLoad = () => {
      setLoadScripts(true);
      // Clean up listeners once triggered
      window.removeEventListener("scroll", triggerLoad);
      window.removeEventListener("mousemove", triggerLoad);
      window.removeEventListener("touchstart", triggerLoad);
    };

    // Set a timeout as a fallback, in case the user does nothing
    const fallbackTimeout = setTimeout(triggerLoad, 4000); // 4 seconds

    // Add event listeners to load scripts on first user interaction
    window.addEventListener("scroll", triggerLoad, { once: true });
    window.addEventListener("mousemove", triggerLoad, { once: true });
    window.addEventListener("touchstart", triggerLoad, { once: true });

    // Cleanup function to remove listeners and timeout if the component unmounts
    return () => {
      clearTimeout(fallbackTimeout);
      window.removeEventListener("scroll", triggerLoad);
      window.removeEventListener("mousemove", triggerLoad);
      window.removeEventListener("touchstart", triggerLoad);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  if (!loadScripts) {
    return null; // Don't render anything until it's time to load
  }

  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  return (
    <>
      <GoogleTagManager gtmId={process.env.GoogleTagMangerID} />
      <GoogleAnalytics gaId={process.env.GoogleAnalyticsID} />
      <SpeedInsights />
      <Script
        id="facebook-pixel"
        strategy="worker" // Still use the worker strategy!
        dangerouslySetInnerHTML={{
          __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `,
        }}
      />
      {/* The noscript tag should remain in the layout for non-JS users */}
    </>
  );
}
