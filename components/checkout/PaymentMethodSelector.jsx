"use client";
import { useState } from "react";
import RadioButton from "../RadioButton";

export default function PaymentMethodSelector({ setPaymentMethod, className }) {
  const [selectedMethod, setSelectedMethod] = useState("cod");

  function onChangeHandler(id) {
    setPaymentMethod(id);
    setSelectedMethod(id);
  }

  return (
    <div
      className={`bg-slate-200 dark:text-slate-300 dark:bg-slate-600 p-2 rounded-md font-bold ${className}`}
    >
      <p> পেমেন্ট মেথডঃ</p>
      <div className="flex flex-row gap-2">
        <RadioButton
          id="cod"
          name="paymentMethod"
          label="ক্যাশ অন ডেলিভারি"
          isSelected={selectedMethod === "cod"}
          onSelect={onChangeHandler}
        />
      </div>
    </div>
  );
}
