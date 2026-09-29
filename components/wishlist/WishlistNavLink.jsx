"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  readWishlist,
  WISHLIST_CHANGE_EVENT,
  WISHLIST_STORAGE_KEY,
} from "@/utils/wishlist";

export default function WishlistNavLink({ className = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = (items) => setCount((items || readWishlist()).length);
    const handleChange = (event) => updateCount(event.detail?.items);
    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) updateCount();
    };

    updateCount();
    window.addEventListener(WISHLIST_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <Link
      href="/wishlist"
      aria-label={`পছন্দের তালিকা${count ? `, ${count}টি পণ্য` : ""}`}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full transition-colors hover:bg-primary-soft hover:text-primary ${className}`}
    >
      <Heart className="h-6 w-6" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-xs font-bold leading-5 text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
