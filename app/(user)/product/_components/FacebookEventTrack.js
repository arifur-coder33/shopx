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

import { useEffect, useRef } from "react";

export default function FacebookEventTrack({ product }) {
  const hasFired = useRef(false);

  const sendViewContent = () => {
    if (hasFired.current || !product) return;

    const price = product.discountPrice || product.regularPrice || 0;

    const data = {
      content_name: product.title,
      content_ids: [product.id.toString()],
      content_type: "product",
      content_category: product.category?.name || "General",
      value: Number(price),
      currency: "BDT",
    };

    // fbq ready?
    if (typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", data);
      console.log("FB ViewContent →", product.title, price, "BDT");
      hasFired.current = true;
    } else {
      // queue push
      (window._fbq = window._fbq || []).push(["track", "ViewContent", data]);
      console.log("FB ViewContent queued →", product.title);
    }
  };

  // পেজ লোড হও হোক বা রিলোড হোক — দুইবার চলবে না, কিন্তু ১০০% ফায়ার হবে
  useEffect(() => {
    sendViewContent();

    // যদি fbq পরে লোড হয়, তবুও চেষ্টা করব
    const timer = setTimeout(sendViewContent, 2000);
    const timer2 = setTimeout(sendViewContent, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [product]);

  return null;
}
