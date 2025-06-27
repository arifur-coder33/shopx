"use client";
import { trackFacebookEvent } from "@/utils/fbEventTrack";
import dynamic from "next/dynamic";
import Link from "next/link";
// Dynamically import Button and KalapanaFont
const Button = dynamic(() => import("../button"));
const KalapanaFont = dynamic(() => import("../KalapanaFont"));

export default function BuyNowButton({ product, slug, ...restProps }) {
  // Track the Initiate Checkout event
  const handleBuyNowClick = () => {
    trackFacebookEvent("InitiateCheckout", {
      content_type: "product",
      content_id: product.id,
      value: product.discountPrice || product?.regularPrice,
      currency: "BDT", // Bangladeshi Taka
    });
  };

  return (
    <>
      <Link href={`/buynow/${slug || product?.slug}`}>
        <Button
          onClick={handleBuyNowClick}
          className={"bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
          {...restProps}
        >
          <KalapanaFont>এখনি কিনুন</KalapanaFont>{" "}
        </Button>
      </Link>

      {/* <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="bottom">
        <CheckOut />
      </Modal> */}
    </>
  );
}
