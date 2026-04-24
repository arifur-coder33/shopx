"use client";
import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";

export default function CardBuyNow({ product, children }) {
  const { data: session, status } = useSession();
  const { hasVariations, discountPrice, regularPrice, slug, category } =
    product || {};

  const price =
    discountPrice && discountPrice > 0 ? discountPrice : regularPrice;
  const handleEventTrck = () => {
    trackEvent({
      event: EVENTS.ADD_TO_CART,
      value: price,
      items: [
        {
          id: product?.id,
          quantity: 1,
          price: discountPrice > 0 ? discountPrice : regularPrice,
          name: product?.title,
          category: category?.name || "Uncategorized",
        },
      ],
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  };

  return (
    <span className="cursor-pointer" onMouseDown={handleEventTrck}>
      {children}
    </span>
  );
}
