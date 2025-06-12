// The layout from your first question (e.g., app/(user)/layout.js)
/* eslint-disable @next/next/no-img-element */
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/NavBar"; // The optimized NavBar from our previous discussion
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

// The metadata from this layout will be merged with the RootLayout's metadata
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
  // No need to preconnect again, but it doesn't hurt
};

export default function UserLayout({ children }) {
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  return (
    <>
      {/* 
        NO PROVIDERS HERE! They are already in the RootLayout.
        This component is now just for structure.
      */}
      <NavBar />
      <main className="max-w-7xl mx-auto p-2 min-h-screen">{children}</main>
      <Footer />
      
      {/* All your scripts can remain here */}
      <GoogleTagManager gtmId={process.env.GoogleTagMangerID} />
      <SpeedInsights />
      <GoogleAnalytics gaId={process.env.GoogleAnalyticsID} />
      <Script
        id="facebook-pixel"
        strategy="lazyOnload" // Use the optimized strategy
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
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt="Facebook Pixel"
        />
      </noscript>
    </>
  );
}