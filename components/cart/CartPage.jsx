"use client";

import { useCart } from "@/context/CartContext";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { replaceNumbers } from "@/utils/engToBanNumber";
import { ArrowRight, ShoppingBag, ShoppingCart } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import CartItems from "./CartItems";

const money = (value) =>
  replaceNumbers(Number(value || 0).toLocaleString("en-US"));

export default function CartPage({ setIsOpen }) {
  const { data: session } = useSession();
  const {
    cartItems,
    totalCartPrice,
    totalCartQuantity,
    totalCartRegularPrice,
  } = useCart();
  const discount = Math.max(0, totalCartRegularPrice - totalCartPrice);

  const eventHandler = () => {
    setIsOpen(false);
    trackEvent({
      event: EVENTS.CHECKOUT,
      value: totalCartPrice,
      src: "/checkout",
      items: cartItems.map((item) => ({
        id: item?.id,
        quantity: item.quantity,
        price: item.discountPrice || item?.regularPrice,
        productName: item?.title,
        category: item?.category?.name || "Uncategorized",
      })),
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="z-10 -mx-3 shrink-0 border-b border-border bg-surface px-4 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-text">আপনার শপিং ব্যাগ</h2>
            <p className="text-xs text-text-muted">
              {replaceNumbers(String(totalCartQuantity))}টি পণ্য
            </p>
          </div>
        </div>
      </header>

      {cartItems.length > 0 ? (
        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain py-4">
          <CartItems />
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 text-center">
          <span className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-muted text-text-muted">
            <ShoppingCart className="h-9 w-9" aria-hidden="true" />
          </span>
          <h3 className="text-lg font-bold text-text">আপনার ব্যাগ এখন খালি</h3>
          <p className="mt-2 max-w-xs text-sm leading-6 text-text-muted">
            পছন্দের পণ্যগুলো ব্যাগে যোগ করলে এখানে দেখতে পাবেন।
          </p>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-5 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-white"
          >
            কেনাকাটা চালিয়ে যান
          </button>
        </div>
      )}

      {cartItems.length > 0 && (
        <footer className="z-20 -mx-3 shrink-0 border-t border-border bg-surface/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="mb-3 space-y-1 text-sm">
            {discount > 0 && (
              <div className="flex items-center justify-between text-emerald-600">
                <span>আপনার সাশ্রয়</span>
                <span className="font-semibold">৳{money(discount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between gap-3">
              <span className="text-text-muted">সর্বমোট</span>
              <strong className="text-xl text-text">৳{money(totalCartPrice)}</strong>
            </div>
          </div>

          <Link
            href="/checkout?from=cart"
            onClick={eventHandler}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-bold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            Order Now
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </footer>
      )}
    </div>
  );
}
