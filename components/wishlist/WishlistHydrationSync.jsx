"use client";

import { readWishlist, WISHLIST_CHANGE_EVENT } from "@/utils/wishlist";
import { useEffect } from "react";

// Suspense can stream a product grid after the global wishlist effect ran.
// Signal only after this boundary has hydrated, never from a DOM observer.
export default function WishlistHydrationSync() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(WISHLIST_CHANGE_EVENT, {
          detail: { items: readWishlist() },
        }),
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
