import CategorySidebar from "@/app/(user)/category/_compoents/CategorySidebar";
import Cart from "@/components/Cart";
import { Heart, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
export default function MobileFooter() {
  return (
    <div className="z-50 fixed bottom-0 md:hidden left-0 right-0 flex justify-center">
      <div className="w-full max-w-md px-4 pb-4">
        <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-slate-700">
          {/* Center Button */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2">
            <Link href="/">
              <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg scale-110">
                <Home className="text-white" size={26} />
              </div>
            </Link>
          </div>

          {/* Menu */}
          <div className="flex justify-between items-center px-6 py-4">
            <CategorySidebar>
              <LayoutGrid className="text-gray-600 dark:text-gray-300" />
            </CategorySidebar>
            {/* <Link href="/category">
              <LayoutGrid className="text-gray-600 dark:text-gray-300" />
            </Link> */}

            <Link href="/wishlist">
              <Heart className="text-gray-600 dark:text-gray-300" />
            </Link>

            <div className="w-28" />
            <Cart>
              <ShoppingCart className="text-gray-600 dark:text-gray-300" />
            </Cart>
            {/* <Link href="/cart">
              <ShoppingCart className="text-gray-600 dark:text-gray-300" />
            </Link> */}

            <Link href="/my-account/orders">
              <User className="text-gray-600 dark:text-gray-300" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
