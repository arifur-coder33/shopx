// // src/components/ThirdPartyScripts.js

// "use client";

// import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
// import { SpeedInsights } from "@vercel/speed-insights/next";
// import Script from "next/script";
// import { useEffect, useState } from "react";

// export default function ThirdPartyScripts() {
//   const [loadScripts, setLoadScripts] = useState(false);

//   useEffect(() => {
//     // Define a function to trigger script loading
//     const triggerLoad = () => {
//       setLoadScripts(true);
//       // Clean up listeners once triggered
//       window.removeEventListener("scroll", triggerLoad);
//       window.removeEventListener("mousemove", triggerLoad);
//       window.removeEventListener("touchstart", triggerLoad);
//     };

//     // Set a timeout as a fallback, in case the user does nothing
//     const fallbackTimeout = setTimeout(triggerLoad, 4000); // 4 seconds

//     // Add event listeners to load scripts on first user interaction
//     window.addEventListener("scroll", triggerLoad, { once: true });
//     window.addEventListener("mousemove", triggerLoad, { once: true });
//     window.addEventListener("touchstart", triggerLoad, { once: true });

//     // Cleanup function to remove listeners and timeout if the component unmounts
//     return () => {
//       clearTimeout(fallbackTimeout);
//       window.removeEventListener("scroll", triggerLoad);
//       window.removeEventListener("mousemove", triggerLoad);
//       window.removeEventListener("touchstart", triggerLoad);
//     };
//   }, []); // Empty dependency array ensures this runs only once on mount

//   if (!loadScripts) {
//     return null; // Don't render anything until it's time to load
//   }

//   const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
//   const tagId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
//   const analyticesId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICES_ID;

//   return (
//     <>
//       {tagId && <GoogleTagManager gtmId={tagId} />}
//       {analyticesId && <GoogleAnalytics gaId={analyticesId} />}

//       <SpeedInsights />
//       {pixelId && (
//         <Script
//           id="facebook-pixel"
//           strategy="worker" // Still use the worker strategy!
//           dangerouslySetInnerHTML={{
//             __html: `
//               !function(f,b,e,v,n,t,s)
//               {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
//               n.callMethod.apply(n,arguments):n.queue.push(arguments)};
//               if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
//               n.queue=[];t=b.createElement(e);t.async=!0;
//               t.src=v;s=b.getElementsByTagName(e)[0];
//               s.parentNode.insertBefore(t,s)}(window, document,'script',
//               'https://connect.facebook.net/en_US/fbevents.js');
//               fbq('init', '${pixelId}');
//               fbq('track', 'PageView');
//             `,
//           }}
//         />
//       )}
//     </>
//   );
// }

// file: src/components/ThirdPartyScripts.js

// This component can now be a simple Server Component.
// We remove "use client", useState, and useEffect for better performance.
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

/**
 * Renders all third-party scripts using the optimal strategy.
 * This component standardizes on Next.js's Partytown integration (`strategy="worker"`)
 * to move script execution to a background thread, freeing up the main thread
 * and improving key performance metrics like INP and TBT.
 */
export default function ThirdPartyScripts() {
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const gtmId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICES_ID;

  return (
    <>
      {/* Vercel Speed Insights is optimized by Vercel and does not need a strategy. */}
      <SpeedInsights />

      {/* --- Google Tag Manager with Partytown --- */}
      {/* GTM is the recommended way to manage other tags like Google Analytics. */}
      {gtmId && (
        <Script
          id="google-tag-manager"
          strategy="worker" // <-- Use the worker strategy
          dangerouslySetInnerHTML={{
            __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
          }}
        />
      )}

      {/* --- Google Analytics (gtag.js) with Partytown --- */}
      {/* 
        IMPORTANT: You typically load Google Analytics THROUGH Google Tag Manager.
        If you are doing that, you DO NOT need this block of code.
        Include this only if you are loading gtag.js separately from GTM.
      */}
      {gaId &&
        !gtmId && ( // <-- Logic to prevent loading both
          <>
            <Script
              id="google-analytics-src"
              strategy="worker" // <-- Use the worker strategy
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script
              id="google-analytics-init"
              strategy="worker"
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `,
              }}
            />
          </>
        )}

      {/* --- Facebook Pixel with Partytown --- */}
      {pixelId && (
        <Script
          id="facebook-pixel"
          strategy="worker" // <-- Use the worker strategy
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
      )}
    </>
  );
}
