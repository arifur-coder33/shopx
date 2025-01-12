import Footer from "@/components/footer/Footer";
import NavBar from "@/components/NavBar";
import { CartProvider } from "@/context/CartContext";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionProvider } from "next-auth/react";
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
  links: [{ rel: "preconnect", href: "https://res.cloudinary.com" }],
};

export default function UserLayout({ children }) {
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
    </>
  );
}
