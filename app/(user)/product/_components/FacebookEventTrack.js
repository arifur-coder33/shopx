// "use client";
// import { useEffect } from "react";

// export default function FacebookEventTrac({ product }) {
//   const schemaEvent = {
//     content_name: product?.title,
//     content_ids: [product?.id],
//     content_type: "product",
//     value: product?.discountPrice || product?.regulartPrice,
//     currency: "BDT",
//   };

//   useEffect(() => {
//     if (typeof fbq !== "undefined") {
//       fbq("track", "ViewContent", schemaEvent);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [product?.slug]); // Fires every time the slug changes

//   return <div></div>;
// }

// components/FacebookEventTrack.js
"use client";

import { useEffect } from "react";

export default function FacebookEventTrack({ product }) {
  useEffect(() => {
    if (!product || typeof window === "undefined" || !window.fbq) return;

    const value = product.discountPrice || product.regularPrice;

    window.fbq("track", "ViewContent", {
      content_name: product.title,
      content_ids: [product.id.toString()],
      content_type: "product",
      content_category: product.category?.name || "Unknown",
      value: value,
      currency: "BDT",
    });

    console.log("ViewContent fired:", product.title); // debug করার জন্য
  }, [product]);

  return null; // কিছুই রেন্ডার করবে না
}
