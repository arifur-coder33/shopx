// src/components/Providers.js
"use client";
import { CartProvider } from "@/context/CartContext";
import { ModalProvider } from "@/context/ModalContext";
import { SessionProvider } from "next-auth/react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import toast styles here
import SocialTrackingInit from "./SocialTrackingInit";

// You can also add other providers here if needed in the future
// import { ThemeProvider } from 'next-themes'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CartProvider>
        {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
        <ModalProvider>
          <SocialTrackingInit />
          {children}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light" // or "dark" or "colored"
          />
        </ModalProvider>
        {/* </ThemeProvider> */}
      </CartProvider>
    </SessionProvider>
  );
}
