"use client";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";

export default function CardBuyNow({ product, children }) {
  const { data: session, status } = useSession();
  const {
    id,
    title,
    slug,
    regularPrice,
    discountPrice,
    hasVariations,

    category,
  } = product || {};

  const price =
    discountPrice && discountPrice > 0 ? discountPrice : regularPrice;
  const handleEventTrck = () => {
    if (!hasVariations) {
      trackEvent({
        event: EVENTS.CHECKOUT,
        value: price,
        src: `/product/${slug}`,
        items: [
          {
            id: id,
            quantity: 1,
            price: price,
            productName: title,
            category: category || "Uncategorized",
          },
        ],
        user: {
          email: session?.user?.email,
          phone: session?.user?.phone,
        },
      });
    }
    return;
  };

  return (
    <span className="cursor-pointer" onMouseDown={handleEventTrck}>
      {children}
    </span>
  );
}
