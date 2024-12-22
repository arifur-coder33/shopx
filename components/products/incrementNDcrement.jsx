"use client";

import { replaceNumbers } from "@/utils/engToBanNumber";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import Button from "../button";
export default function IncrementNDcrement({
  style,
  initialQty,
  incrementHandler,
  decrementHandler,
}) {
  const [qty, setQty] = useState(initialQty || 1);
  const increment = () => {
    if (qty < 10) {
      const newQty = qty + 1; // Calculate the updated value
      setQty(newQty); // Update the state
      if (incrementHandler) {
        incrementHandler(newQty); // Use the updated value
      }
    }
  };
  // useEffect(() => {
  //   if (qtyHandler) {
  //     qtyHandler(qty);
  //   }
  // }, [qty, qtyHandler]);
  // useEffect(() => {
  //   if (quantity > 1) {
  //     setQty(quantity);
  //   }
  // }, [quantity]);

  const decrement = () => {
    if (qty > 1) {
      const newQty = qty - 1; // Calculate the updated value
      setQty(newQty); // Update the state
      if (decrementHandler) {
        decrementHandler(newQty);
      }
    }
  };

  return (
    <div className="flex flex-row  gap-2 pl-2 text-center">
      <Button
        onClick={decrement}
        className={`${
          style === "simple"
            ? ""
            : "border border-b-4 dark:border-slate-300 border-slate-700  rounded-full px-3  opacity-65"
        }`}
      >
        <Minus />
      </Button>
      <input hidden defaultValue={qty} name="quantity" />
      <input
        id="qtyinput"
        readOnly
        type="string"
        value={replaceNumbers(qty.toString())}
        className={` ${
          style === "simple" ? "w-6" : "w-12 text-4xl p-1 "
        } rounded-lg dark:bg-black border-2 border-slate-300 text-center`}
      />{" "}
      <Button
        onClick={increment}
        className={`${
          style === "simple"
            ? ""
            : "border border-b-4 dark:border-slate-300 border-slate-700  rounded-full px-3  opacity-65"
        }`}
      >
        <Plus />
      </Button>
    </div>
  );
}
