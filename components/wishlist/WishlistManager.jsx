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
    syncButtons();

    const handleClick = async (event) => {
      const cartButton = event.target.closest?.("[data-product-card-cart]");
      if (cartButton) {
        event.preventDefault();
        if (cartButton.disabled) return;

        const slug = cartButton.dataset.productCardCart;
        const originalText = cartButton.textContent;
        cartButton.disabled = true;
        cartButton.textContent = "যোগ হচ্ছে…";

        try {
          // Full stock data is requested only after a user clicks Add to Cart.
          const result = await getStorefrontCartItem(slug);
          if (!result?.success || !result.data) {
            throw new Error("Product is unavailable");
          }

          addToCartRef.current(result.data, 1);

          const { toast } = await import("react-toastify");
          toast.success("পণ্যটি ব্যাগে যোগ হয়েছে");
        } catch {
          const { toast } = await import("react-toastify");
          toast.error("পণ্যটি এখন ব্যাগে যোগ করা যাচ্ছে না");
        } finally {
          cartButton.disabled = false;
          cartButton.textContent = originalText;
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

    // Product grids can arrive through Suspense after hydration. Observe only
    // the short route-loading window, then disconnect to keep runtime work zero.
    const lateContentObserver = new MutationObserver((mutations) => {
      const items = readWishlist();
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) syncButtons(items, node);
        });
      });
    });
    lateContentObserver.observe(document.body, { childList: true, subtree: true });
    const observerTimeout = window.setTimeout(
      () => lateContentObserver.disconnect(),
      5000,
    );

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleStorage);
      window.clearTimeout(observerTimeout);
      lateContentObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
