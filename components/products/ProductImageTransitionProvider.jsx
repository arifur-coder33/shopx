"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProductImageTransitionProvider({ children }) {
  const router = useRouter();

  useEffect(() => {
    const handleClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const link = event.target instanceof Element
        ? event.target.closest("a[data-product-image-transition]")
        : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;

      event.preventDefault();
      const href = `${destination.pathname}${destination.search}${destination.hash}`;
      const startViewTransition = document.startViewTransition?.bind(document);
      const image = link.querySelector("img[data-transition-product-id]");
      if (image) image.style.viewTransitionName = "shared-product-image";
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (typeof startViewTransition !== "function" || reducedMotion || !image) {
        router.push(href);
        return;
      }

      try {
        startViewTransition(() => {
          router.push(href);
          // Let an already-prefetched route commit if it is ready, but never
          // hold the route transition while a slower server response is pending.
          return new Promise((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(resolve));
          });
        });
      } catch {
        router.push(href);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  return children;
}
