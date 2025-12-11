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
        <RadioButton
          id="bkash"
          name="paymentMethod"
          label="বিকাশ"
          isSelected={selectedMethod === "bkash"}
          onSelect={onChangeHandler}
        />
      </div>

      {selectedMethod === "bkash" && (
        <div className="mt-2 p-2 bg-slate-300 dark:bg-slate-700 rounded-md">
          <p className="font-bold mb-1">বিকাশ পেমেন্ট নির্দেশনাঃ</p>
          <ol className="list-decimal list-inside">
            <li>আপনার বিকাশ অ্যাপ খুলুন।</li>
            <li>“Send Money” অপশন সিলেক্ট করুন।</li>
            <li>
              নিচের বিকাশ নাম্বারে টাকা পাঠানঃ{" "}
              <span className="font-bold">01723228741</span>
            </li>
            <li>
              অর্ডার কনফার্মেশন এর জন্য ট্রাঞ্জেকশন আইডি অর্ডার নোট এ লিখুন।
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
