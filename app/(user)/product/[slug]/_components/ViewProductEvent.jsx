"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function ViewProductEvent({ product }) {
  const { data: session } = useSession();
  const price =
    product?.variations[0].discountPrice ||
    product?.variations[0].regularPrice ||
    0;
  useEffect(() => {
    trackEvent({
      event: EVENTS.VIEW,
      value: price,
      src: `/product/${product?.slug}`,
      items: [
        {
          id: product?.variations[0].sku,
          quantity: 1,
          price: price,
          productName: product?.title,
          category: product.category?.name || "Uncategorized",
        },
      ],
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  }, [product, session, price]);
  return <div></div>;
}
