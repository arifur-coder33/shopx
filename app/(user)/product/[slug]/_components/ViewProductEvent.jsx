"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { recordRecentlyViewedProduct } from "@/utils/recentlyViewedProducts";

export default function ViewProductEvent({ product }) {
  const { status } = useSession();
  const lastTrackedProduct = useRef(null);
  const variation = product?.variations?.[0];
  const price =
    variation?.discountPrice ||
    variation?.regularPrice ||
    0;
  useEffect(() => {
    recordRecentlyViewedProduct(product);
  }, [product]);

  useEffect(() => {
    if (status === "loading" || !product?.id || lastTrackedProduct.current === product.id) return;
    lastTrackedProduct.current = product.id;
    trackEvent({
      event: EVENTS.VIEW,
      value: price,
      src: `/product/${product?.slug}`,
      items: [
        {
          id: variation?.sku || product?.id,
          quantity: 1,
          price: price,
          productName: product?.title,
          category: product.category?.name || "Uncategorized",
        },
      ],
    });
  }, [product, status, price]);

  useEffect(() => {
    if (!product?.id) return;
    const key = `product-view-counted:${product.id}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Count once per page visit when session storage is unavailable.
    }
    fetch("/api/product-view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product.id }),
      keepalive: true,
    }).catch(() => {});
  }, [product?.id]);
  return <div></div>;
}
