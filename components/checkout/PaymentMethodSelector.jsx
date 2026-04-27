"use client";
import { useState } from "react";
import RadioButton from "../RadioButton";

export default function PaymentMethodSelector({ setPaymentMethod, className }) {
  const [selectedMethod, setSelectedMethod] = useState("cod");
  const sslActive = process.env.NEXT_PUBLIC_SSLCZ_STORE_ID;
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
        {sslActive && (
          <>
            <RadioButton
              id="online"
              name="paymentMethod"
              label="Online/Bkash/Card"
              isSelected={selectedMethod === "online"}
              onSelect={onChangeHandler}
            />

            <RadioButton
              id="emi"
              name="paymentMethod"
              label="EMI"
              isSelected={selectedMethod === "emi"}
              onSelect={onChangeHandler}
            />
          </>
        )}
      </div>
      {/* <BkashPayButton />
      <SSLCommerzPayButton /> */}
    </div>
  );
}
