// src/components/Providers.js
"use client";

import { SessionProvider } from "next-auth/react";
// If you bring CartProvider back, import it here
// import { CartProvider } from "@/context/CartContext"; 

export default function Providers({ children }) {
  return (
    <SessionProvider>
      {/* <CartProvider> */}
      {children}
      {/* </CartProvider> */}
    </SessionProvider>
  );
}