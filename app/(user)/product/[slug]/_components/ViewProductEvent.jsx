"use client";

import { trackEvent } from "@/lib/SocialEventTracking";
import { EVENTS } from "@/lib/SocialEventTracking/events";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function ViewProductEvent({ product }) {
  const { data: session } = useSession();
  useEffect(() => {
    trackEvent({
      event: EVENTS.VIEW,
      value: product?.price || 0,
      items: [
        {
          id: product?.id,
          quantity: 1,
          price:
            product?.variations[0].discountPrice ||
            product?.price ||
            product?.variations[0].regularPrice ||
            0,
          name: product?.title,
          category: product.category?.name || "Uncategorized",
        },
      ],
      user: {
        email: session?.user?.email,
        phone: session?.user?.phone,
      },
    });
  }, [product, session]);
  return <div></div>;
}
