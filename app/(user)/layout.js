import NavBar from "@/components/NavBar";
import { CartProvider } from "@/context/CartContext";
import { SessionProvider } from "next-auth/react";
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function UserLayout({ children }) {
  return (
    <SessionProvider>
      <CartProvider>
        <NavBar hideCart={false} />

        <div className="max-w-7xl mx-auto p-2">{children}</div>
      </CartProvider>
    </SessionProvider>
  );
}
