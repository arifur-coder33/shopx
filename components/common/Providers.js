// src/components/Providers.js
"use client";

import { CartProvider } from "@/context/CartContext";
import { ModalProvider } from "@/context/ModalContext";
import { SessionProvider } from "next-auth/react";
import { Suspense } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; // Import toast styles here

// You can also add other providers here if needed in the future
// import { ThemeProvider } from 'next-themes'

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <CartProvider>
        {/* <ThemeProvider attribute="class" defaultTheme="system" enableSystem> */}
        <Suspense fallback={<div className="text-white">Loading...</div>}>
          <ModalProvider>
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
        </Suspense>
        {/* </ThemeProvider> */}
      </CartProvider>
    </SessionProvider>
  );
}
