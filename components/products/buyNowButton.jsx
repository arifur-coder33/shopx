"use client";
import { trackFacebookEvent } from "@/utils/fbEventTrack";
import Link from "next/link";
import Button from "../button";

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
          className={"bg-cyan-500  border-b-4 border-b-cyan-700 p-2"}
          {...restProps}
        >
          Order Now
        </Button>
      </Link>

      {/* <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="bottom">
        <CheckOut />
      </Modal> */}
    </>
  );
}
