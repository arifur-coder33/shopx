"use client";
import Link from "next/link";
import { useState } from "react";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";

export default function BuyNowButton(props) {
  const [isOpen, setIsOpen] = useState(false);
  const { productId } = props;

  return (
    <>
      <Link href={`/checkout?from=directBuy&p=${productId}`}>
        <Button
          className={"bg-sky-500 border-b-4 border-b-sky-700 p-2"}
          {...props}
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
