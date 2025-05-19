/* eslint-disable @next/next/no-img-element */
import { Tiro_Bangla } from "next/font/google";

import { CartProvider } from "@/context/CartContext";
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
      <head>
         <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      </head>
      <body className={` ${tiro_bangla.className}  antialiased  theam`}>
        <NextTopLoader showSpinner={false} />
        <CartProvider>
          <div className="">{children}</div>
        </CartProvider>
        <ToastContainer />
      </body>
    </html>
  );
}
