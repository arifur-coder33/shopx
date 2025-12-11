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
// components/FacebookEventTrack.js  (শুধু JavaScript)
"use client";

import { useEffect } from "react";

export default function FacebookEventTrack({ product }) {
  useEffect(() => {
    // যদি প্রোডাক্ট না থাকে বা window না থাকে, তাহলে…
    if (!product || typeof window === "undefined") return;

    const value = product.discountPrice || product.regularPrice;

    const eventData = {
      content_name: product?.title,
      content_ids: [product?.id.toString()],
      content_type: "product",
      content_category: product?.category?.name || "Unknown",
      value: Number(value),
      currency: "BDT",
    };

    // fbq already loaded হলে সাথে সাথে পাঠাবে
    if (window.fbq) {
      window.fbq("track", "ViewContent", eventData);
      console.log("ViewContent fired instantly:", product.title);
    }
    // fbq এখনো load হয়নি → queue তে রেখে দিবে (Facebook নিজেই পরে নিবে)
    else {
      // _fbq queue তৈরি করা থাকলে push করবে, না থাকলে নতুন তৈরি করবে
      window._fbq = window._fbq || [];
      window._fbq.push(["track", "ViewContent", eventData]);
      console.log(
        "ViewContent queued (will fire when pixel loads):",
        product.title
      );
    }
  }, [product]);

  // কিছু রেন্ডার করবে না
  return null;
}
