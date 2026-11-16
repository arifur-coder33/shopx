// src/components/Providers.js
"use client";
import { CartProvider } from "@/context/CartContext";
import { ModalProvider } from "@/context/ModalContext";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import "react-toastify/dist/ReactToastify.css"; // Import toast styles here
import SocialTrackingInit from "./SocialTrackingInit";
import CheckoutLinkTracker from "./CheckoutLinkTracker";
import WishlistManager from "../wishlist/WishlistManager";
import { createContext, useContext } from "react";

const SiteAppearanceContext = createContext(null);
export const useSiteAppearance = () => useContext(SiteAppearanceContext);

const ToastContainer = dynamic(
  () => import("react-toastify").then((module) => module.ToastContainer),
  { ssr: false },
);

// You can also add other providers here if needed in the future
// import { ThemeProvider } from 'next-themes'

export default function Providers({ children, appearance }) {
  return (
    <SiteAppearanceContext.Provider value={appearance}>
      <SessionProvider
        refetchInterval={0}
        refetchOnWindowFocus={false}
        refetchWhenOffline={false}
      >
        <CartProvider>
          {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
          <ModalProvider>
            <SocialTrackingInit />
            <CheckoutLinkTracker />
            <WishlistManager />
            {children}
            <ToastContainer
              position="top-right"
              autoClose={10000}
              hideProgressBar={false}
              newestOnTop
              closeOnClick={false}
              rtl={false}
              pauseOnFocusLoss
              draggable={false}
              pauseOnHover
              theme="light" // or "dark" or "colored"
            />
          </ModalProvider>
          {/* </ThemeProvider> */}
        </CartProvider>
      </SessionProvider>
    </SiteAppearanceContext.Provider>
  );
}
