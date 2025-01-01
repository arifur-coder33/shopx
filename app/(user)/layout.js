import NavBar from "@/components/NavBar";
import { CartProvider } from "@/context/CartContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SessionProvider } from "next-auth/react";
import { GoogleTagManager,GoogleAnalytics } from '@next/third-parties/google'
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function UserLayout({ children }) {
  return (
    <>
    <GoogleTagManager gtmId={process.env.GoogleTagMangerID} />
      <SessionProvider>
        <CartProvider>
          <NavBar />

          <div className="max-w-7xl mx-auto p-2">{children}</div>
        </CartProvider>
      </SessionProvider>
      <SpeedInsights />
      <GoogleAnalytics gaId={process.env.GoogleAnalyticsID} />
    </>
  );
}
