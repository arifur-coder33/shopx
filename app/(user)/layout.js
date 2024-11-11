import NavBar from "@/components/NavBar";
import { CartProvider } from "@/context/CartContext";
export const metadata = {
  title: " আমার শপ",
  description: "ঘরে বসে পন্য অর্ডার করুন",
};

export default function UserLayout({ children }) {
  return (
  
      <CartProvider >
    
        <NavBar />
  
        <div className="max-w-7xl mx-auto p-2">{children}</div>
      </CartProvider>
   
  );
}
