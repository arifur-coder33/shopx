"use client";
import Link from "next/link";
import { useState } from "react";
import Button from "../button";
import KalapanaFont from "../KalapanaFont";

export default function BuyNowButton(props) {
  const [isOpen, setIsOpen] = useState(false);
  const { slug } = props;

  return (
    <>
      <Link href={`/buynow/${slug}`}>
        <Button
          className={"bg-cyan-500 border-b-4 border-b-cyan-700 p-2"}
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
