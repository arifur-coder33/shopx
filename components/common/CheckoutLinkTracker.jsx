"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function CheckoutLinkTracker() {
  const { data: session } = useSession();

  useEffect(() => {
    const trackCheckoutLink = (event) => {
      const link = event.target.closest?.("[data-checkout-product]");
      if (!link?.dataset.checkoutProduct) return;

      try {
        const product = JSON.parse(link.dataset.checkoutProduct);
        trackEvent({
          event: EVENTS.CHECKOUT,
          value: product.price,
          src: `/product/${product.slug}`,
          items: [
            {
              id: product.id,
              quantity: 1,
              price: product.price,
              productName: product.title,
              category: product.category || "Uncategorized",
            },
          ],
          user: {
            email: session?.user?.email,
            phone: session?.user?.phone,
          },
        });
      } catch {
        // Tracking must never delay or block navigation.
      }
    };

    document.addEventListener("pointerdown", trackCheckoutLink, {
      passive: true,
    });
    return () => document.removeEventListener("pointerdown", trackCheckoutLink);
  }, [session?.user?.email, session?.user?.phone]);

  return null;
}
