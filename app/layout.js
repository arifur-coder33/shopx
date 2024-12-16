import { Tiro_Bangla } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
const tiro_bangla = Tiro_Bangla({
  subsets: ["bengali"],
  display: "swap",
  weight: "400",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL),
  title: "ShopX - Your Online Store",
  description: "ShopX - The best place to shop online.",
  icons: {
    // Single icon definition for favicon
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png", // This is for Apple devices
    shortcut: "/favicon.ico", // Fallback for shortcut icon
  },
  manifest: "/site.webmanifest",
  appleMobileWebAppTitle: "ShopX",
  openGraph: {
    title: "ShopX - Your Online Store",
    description: "ShopX - The best place to shop online.",
    url: process.env.NEXT_PUBLIC_SITE_URL,
    // Add your actual website URL here
    site_name: "ShopX",
    images: [
      {
        url: "/images/site_logo_og.png", // Provide the image URL for OpenGraph
        width: 1200,
        height: 630,
        alt: "ShopX - Your Online Store",
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
      </body>
    </html>
  );
}
