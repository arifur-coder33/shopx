/* eslint-disable @next/next/no-img-element */
import Footer from "@/components/footer/Footer";
import NavBar from "@/components/NavBar";
import { CartProvider } from "@/context/CartContext";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionProvider } from "next-auth/react";
import Script from "next/script";
export const metadata = {
  title: " ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
  links: [{ rel: "preconnect", href: "https://res.cloudinary.com" }],
  verification: {
    google: "RhEUL_-hL1O7iK2ojfqS-ADzvS-uoODAoCkNetv0iBI", // Google Search Console
  },
};

export default function UserLayout({ children }) {
  const pixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  return (
    <>
      <GoogleTagManager gtmId={process.env.GoogleTagMangerID} />
      <SessionProvider>
        <CartProvider>
          <NavBar />

          <div className="max-w-7xl mx-auto p-2 min-h-screen">{children}</div>
          <Footer />
        </CartProvider>
      </SessionProvider>
      <SpeedInsights />
      <GoogleAnalytics gaId={process.env.GoogleAnalyticsID} />
      <Script
        id="facebook-pixel"
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
