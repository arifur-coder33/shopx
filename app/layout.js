import { Tiro_Bangla } from "next/font/google";
import Image from "next/image";
import NextTopLoader from "nextjs-toploader";
import { ToastContainer } from "react-toastify";
import "./globals.css";
const tiro_bangla = Tiro_Bangla({
  subsets: ["bengali"],
  display: "swap",
  weight: "400",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
  title: process.env.NEXT_SHOP_NAME + "-" + process.env.NEXT_SHOP_TITLE,
  description: process.env.NEXT_SHOP_NAME + "-" + process.env.NEXT_SHOP_TITLE,
  icons: {
    // Single icon definition for favicon
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png", // This is for Apple devices
    shortcut: "/favicon.ico", // Fallback for shortcut icon
  },
  manifest: "/site.webmanifest",
  appleMobileWebAppTitle: process.env.NEXT_SHOP_NAME,
  openGraph: {
    title: process.env.NEXT_SHOP_NAME + "-" + process.env.NEXT_SHOP_TITLE,
    description: "ShopX - The best place to shop online.",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    // Add your actual website URL here
    site_name: process.env.NEXT_SHOP_NAME,
    images: [
      {
        url: "/images/site_logo_og.png", // Provide the image URL for OpenGraph
        width: 1200,
        height: 630,
        alt: process.env.NEXT_SHOP_NAME + "-" + process.env.NEXT_SHOP_TITLE,
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body className={` ${tiro_bangla.className}  antialiased  theam`}>
        <NextTopLoader showSpinner={false} />
        <div className="">{children}</div>
        <ToastContainer />
        {/* <Script
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
              fbq('init', '609873341726381');
              fbq('track', 'PageView');
            `,
          }}
        /> */}
        <noscript>
          <Image
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=609873341726381&ev=PageView&noscript=1"
            alt="Facebook Pixel"
          />
        </noscript>
      </body>
    </html>
  );
}
