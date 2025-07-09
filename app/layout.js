// app/layout.js
/* eslint-disable @next/next/no-img-element */

import { ThemeScript } from "@/components/common/ThemeScript";
import dynamic from "next/dynamic";
import { Roboto, Tiro_Bangla } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
const Providers = dynamic(() => import("@/components/common/Providers"));
// Your font setup is perfect, keep it as is
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "700"] });
const tiro_bangla = Tiro_Bangla({
  subsets: ["bengali"],
  display: "swap",
  weight: "400",
});

// Your metadata is excellent, keep it as is
export const metadata = {
  // ... your existing metadata object
};

export default function RootLayout({ children }) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <ThemeScript />
      </head>
      <body
        className={` ${tiro_bangla.className} ${roboto.className} antialiased theam`}
      >
        {/* NextTopLoader is fine here */}
        <NextTopLoader showSpinner={false} />

        {/* Wrap children in the Providers component */}
        <Providers>{children}</Providers>

        {/* 
          ToastContainer and CartProvider have been MOVED into Providers.js
        */}
      </body>
    </html>
  );
}
