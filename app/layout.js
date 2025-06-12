// app/layout.js
/* eslint-disable @next/next/no-img-element */
import Providers from "@/components/common/Providers";
import { Roboto, Tiro_Bangla } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

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
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
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
