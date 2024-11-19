"use client";
import { useState } from "react";
import Button from "../button";
import CheckOut from "../checkout/CheckOut";
import KalapanaFont from "../KalapanaFont";
import Modal from "../Modal";

export default function BuyNowButton(props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setIsOpen(!isOpen)} {...props}>
        <KalapanaFont>এখনি কিনুন</KalapanaFont>{" "}
      </Button>
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} openStyle="bottom">
        <CheckOut />
      </Modal>
    </>
  );
}
