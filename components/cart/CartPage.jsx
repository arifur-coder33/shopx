"use client";
import { useCart } from "@/context/CartContext";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Button from "../button";
import CartItems from "./CartItems";

export default function CartPage({ setIsOpen }) {
  const { data: session } = useSession();
  const { cartItems, totalCartPrice } = useCart();
  console.log("Cart Items in CartPage:", cartItems);
  const eventHandler = () => {
    setIsOpen(false); // Close the cart sidebar/modal
    trackEvent({
      event: EVENTS.CHECKOUT,
      value: totalCartPrice,
      items: cartItems.map((item) => ({
        id: item?.id,
        quantity: item.quantity,
        price: item.discountPrice || item?.regularPrice,
        name: item?.title,
        category: item?.category?.name || "Uncategorized",
      })),

      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  };
  return (
    <div className="h-[calc(100vh-300px)]flex flex-col">
      {/* 🔝 Header */}
      <div className="sticky top-0 z-10 mt-4 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-center text-primary gap-2  py-4 font-bold ">
          <ShoppingBag size={20} />

          <span className="text-xl ">Cart</span>
        </div>
      </div>

      {/* 📦 Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 pb-32">
        {cartItems?.length > 0 ? (
          <CartItems />
        ) : (
          <div className="flex flex-col items-center justify-center mt-20 text-center text-slate-500 dark:text-slate-400">
            <ShoppingBag size={40} className="mb-3 opacity-50" />
            <p className="text-sm">আপনি এখন আপনার ব্যাগে কোন পন্য রাখেননি।</p>
          </div>
        )}
      </div>

      {/* 💰 Bottom Summary (Cave Style Floating) */}
      {cartItems?.length > 0 && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <div className="w-full max-w-md px-4">
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl p-3">
              {/* Price */}
              <p className="text-[13px] text-center text-slate-700 dark:text-slate-300">
                আপনার ব্যাগে মোট{" "}
                <span className="font-bold text-brand-600 dark:text-brand-400">
                  {replaceNumbers(totalCartPrice.toString())}
                </span>{" "}
                টাকার পন্য আছে
              </p>

              {/* Button */}
              <Link href={"/checkout?from=cart"}>
                <Button
                  onClick={eventHandler}
                  className="mt-2 w-full text-md py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:opacity-90 transition"
                >
                  Order Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
