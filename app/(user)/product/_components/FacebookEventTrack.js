"use client";
import { useEffect } from "react";

export default function FacebookEventTrac({ product }) {
  const schemaEvent = {
    content_name: product?.title,
    content_ids: [product?.id],
    content_type: "product",
    value: product?.discountPrice || product?.regulartPrice,
    currency: "BDT",
  };

  useEffect(() => {
    if (typeof fbq !== "undefined") {
      fbq("track", "ViewContent", schemaEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug]); // Fires every time the slug changes

  return <div></div>;
}
