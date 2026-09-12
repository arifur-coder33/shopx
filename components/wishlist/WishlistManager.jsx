"use client";

import { getStorefrontCartItem } from "@/backend/serverActions/storefrontCartAction";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  readWishlist,
  toggleWishlistItem,
  wishlistItemKey,
  WISHLIST_CHANGE_EVENT,
  WISHLIST_STORAGE_KEY,
} from "@/utils/wishlist";

function syncButton(button, selectedIds) {
  try {
    const product = JSON.parse(button.dataset.wishlistProduct || "{}");
    const active = selectedIds.has(wishlistItemKey(product));
    button.dataset.wishlistActive = String(active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute(
      "aria-label",
      active
        ? `${product.title || "পণ্য"} পছন্দের তালিকা থেকে সরান`
        : `${product.title || "পণ্য"} পছন্দের তালিকায় যোগ করুন`,
    );
  } catch {
    // A malformed button must not affect the rest of the storefront.
  }
}

function syncButtons(items = readWishlist(), root = document) {
  const selectedIds = new Set(items.map(wishlistItemKey));
  root.querySelectorAll?.("[data-wishlist-button]").forEach((button) =>
    syncButton(button, selectedIds),
  );

  if (root.matches?.("[data-wishlist-button]")) {
    syncButton(root, selectedIds);
  }
}

export default function WishlistManager() {
  const pathname = usePathname();
  const { addToCart } = useCart();
  const addToCartRef = useRef(addToCart);

  useEffect(() => {
    addToCartRef.current = addToCart;
  }, [addToCart]);

  useEffect(() => {
    const handleClick = async (event) => {
      const cartButton = event.target.closest?.("[data-product-card-cart]");
      if (cartButton) {
        event.preventDefault();
        if (cartButton.disabled) return;

        const slug = cartButton.dataset.productCardCart;
        const originalLabel = cartButton.getAttribute("aria-label");
        cartButton.disabled = true;
        cartButton.dataset.loading = "true";
        cartButton.setAttribute("aria-busy", "true");
        cartButton.setAttribute("aria-label", "পণ্য ব্যাগে যোগ হচ্ছে");

        try {
          // Full stock data is requested only after a user clicks Add to Cart.
          const result = await getStorefrontCartItem(slug);
          if (!result?.success || !result.data) {
            throw new Error(result?.error || "Product is unavailable");
          }

          addToCartRef.current(result.data, 1);

          const { toast } = await import("react-toastify");
          toast.success("পণ্যটি ব্যাগে যোগ হয়েছে");
        } catch (error) {
          const { toast } = await import("react-toastify");
          toast.error(error?.message || "পণ্যটি এখন ব্যাগে যোগ করা যাচ্ছে না");
        } finally {
          cartButton.disabled = false;
          delete cartButton.dataset.loading;
          cartButton.removeAttribute("aria-busy");
          if (originalLabel) cartButton.setAttribute("aria-label", originalLabel);
        }
        return;
      }

      const button = event.target.closest?.("[data-wishlist-button]");
      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      try {
        const product = JSON.parse(button.dataset.wishlistProduct || "{}");
        if (!product.id) return;
        const { items } = toggleWishlistItem(product);
        syncButtons(items);
      } catch {
        // Wishlist must never block product navigation.
      }
    };

    const handleChange = (event) => syncButtons(event.detail?.items);
    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) syncButtons();
    };

    document.addEventListener("click", handleClick);
    window.addEventListener(WISHLIST_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleStorage);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname]);

  return null;
}
