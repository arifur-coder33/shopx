// import { SpeedInsights } from "@vercel/speed-insights/next";
// import Script from "next/script";

// /**
//  * Renders all third-party scripts using the optimal strategy.
//  * This component standardizes on Next.js's Partytown integration (`strategy="worker"`)
//  * to move script execution to a background thread, freeing up the main thread
//  * and improving key performance metrics like INP and TBT.
//  */
// export default function ThirdPartyScripts() {
//   const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
//   const gtmId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
//   const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICES_ID;

//   return (
//     <>
//       {/* Vercel Speed Insights is optimized by Vercel and does not need a strategy. */}
//       <SpeedInsights />

//       {/* --- Google Tag Manager with Partytown --- */}
//       {/* GTM is the recommended way to manage other tags like Google Analytics. */}
//       {gtmId && (
//         <Script
//           id="google-tag-manager"
//           strategy="worker" // <-- Use the worker strategy
//           dangerouslySetInnerHTML={{
//             __html: `
//             (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
//             new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
//             j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
//             'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
//             })(window,document,'script','dataLayer','${gtmId}');
//           `,
//           }}
//         />
//       )}

//       {/* --- Google Analytics (gtag.js) with Partytown --- */}
//       {/*
//         IMPORTANT: You typically load Google Analytics THROUGH Google Tag Manager.
//         If you are doing that, you DO NOT need this block of code.
//         Include this only if you are loading gtag.js separately from GTM.
//       */}
//       {gaId &&
//         !gtmId && ( // <-- Logic to prevent loading both
//           <>
//             <Script
//               id="google-analytics-src"
//               strategy="worker" // <-- Use the worker strategy
//               src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
//             />
//             <Script
//               id="google-analytics-init"
//               strategy="worker"
//               dangerouslySetInnerHTML={{
//                 __html: `
//                 window.dataLayer = window.dataLayer || [];
//                 function gtag(){dataLayer.push(arguments);}
//                 gtag('js', new Date());
//                 gtag('config', '${gaId}');
//               `,
//               }}
//             />
//           </>
//         )}

//       {/* --- Facebook Pixel with Partytown --- */}
//       {pixelId && (
//         <Script
//           id="facebook-pixel"
//           strategy="worker" // <-- Use the worker strategy
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

import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

export default function ThirdPartyScripts() {
  const fbId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const gtmId = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
  const gaId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const tiktokId = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

  return (
    <>
      <SpeedInsights />

      {/* 🔵 GTM */}
      {gtmId && (
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `,
          }}
        />
      )}

      {/* 🟢 GA4 (only if no GTM) */}
      {gaId && !gtmId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4"
            strategy="afterInteractive"
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

      {/* 🔵 Facebook Pixel */}
      {fbId && (
        <Script
          id="fb"
          strategy="afterInteractive"
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
              fbq('init', '${fbId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* 🎵 TikTok Pixel */}
      {tiktokId && (
        <Script
          id="tiktok"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;
                var ttq=w[t]=w[t]||[];
                ttq.methods=["page","track"];
                ttq.setAndDefer=function(t,e){
                  t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
                for(var i=0;i<ttq.methods.length;i++){
                  ttq.setAndDefer(ttq,ttq.methods[i]);
                }
                ttq.load('${tiktokId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
