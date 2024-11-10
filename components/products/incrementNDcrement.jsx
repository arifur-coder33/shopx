"use client";

import { replaceNumbers } from "@/utils/engToBanNumber";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import Button from "../button";
export default function IncrementNDcrement() {
  const [qty, setQty] = useState(1);
  const increment = () => {
    if (qty < 10) {
      setQty((prevValue) => prevValue + 1);
    }
  };
  const decrement = () => {
    if (qty > 1) {
      setQty((prevValue) => prevValue - 1);
    }
  };

  return (
    <div className="flex flex-row  gap-2 pl-2 text-center">
      <Button
        onClick={decrement}
        bgcolor={"bg-transparent hover:bg-transparent"}
      >
        <Minus className="border dark:border-slate-300 border-slate-700 bg-purple rounded-full w-8 h-8" />
      </Button>
      <label hidden htmlFor="qtyinput"></label>
      <input
        id="qtyinput"
        name="qtyinput"
        readOnly
        value={replaceNumbers(qty.toString())}
        className="w-12 text-4xl p-1 rounded-lg dark:bg-black border-2 border-slate-300 text-center"
      />

      <Button
        bgcolor={"bg-transparent hover:bg-transparent"}
        onClick={increment}
      >
        <Plus className="border dark:border-slate-300 border-slate-700 bg-slate-900  text-slate-300 rounded-full w-8 h-8" />
      </Button>
    </div>
  );
}
