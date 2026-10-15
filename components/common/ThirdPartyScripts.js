import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

export default function ThirdPartyScripts({ settings = {} }) {
  const fbId = settings.facebookPixelId;
  const gtmId = settings.googleTagId;
  const gaId = settings.googleAnalyticsId;
  const clarityProjectId = settings.clarityProjectId;
  const tiktokId = settings.tiktokPixelId;

  return (
    <>
      <SpeedInsights />

      {clarityProjectId && (
        <Script
          id="microsoft-clarity"
          src={`https://www.clarity.ms/tag/${encodeURIComponent(clarityProjectId)}`}
          strategy="lazyOnload"
        />
      )}

      {/* 🔵 GTM */}
      {gtmId && (
        <Script
          id="gtm"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;
              f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer',${JSON.stringify(gtmId)});
            `,
          }}
        />
      )}

      {/* 🟢 GA4 (only if no GTM) */}
      {gaId && !gtmId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="lazyOnload"
          />
          <Script
            id="ga4"
            strategy="lazyOnload"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(gaId)});
              `,
            }}
          />
        </>
      )}

      {/* 🔵 Facebook Pixel */}
      {fbId && (
        <Script
          id="fb"
          strategy="lazyOnload"
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
              fbq('init', ${JSON.stringify(fbId)});
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* 🎵 TikTok Pixel */}
      {tiktokId && (
        <Script
          id="tiktok"
          strategy="lazyOnload"
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
                ttq.load(${JSON.stringify(tiktokId)});
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
