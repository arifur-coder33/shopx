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

import Script from "next/script";

export default function FacebookEventTrack({ product }) {
  const value = product?.discountPrice || product?.regulartPrice;

  return (
    <>
      <Script
        id="fb-viewcontent"
        strategy="afterInteractive"
        onReady={() => {
          if (typeof fbq !== "undefined" && product) {
            fbq("track", "ViewContent", {
              content_name: product.title,
              content_ids: [product.id],
              content_type: "product",
              value: value,
              currency: "BDT",
            });
          }
        }}
      />
    </>
  );
}
