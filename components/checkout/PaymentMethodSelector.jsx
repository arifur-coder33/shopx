"use client";
import { useState } from "react";
import RadioButton from "../RadioButton";

export default function PaymentMethodSelector({ setPaymentMethod, className }) {
  const [selectedMethod, setSelectedMethod] = useState("");
  const sslActive = process.env.NEXT_PUBLIC_SSLCZ_STORE_ID;
  function onChangeHandler(id) {
    setPaymentMethod(id);
    setSelectedMethod(id);
  }

  return (
    <div
      id="paymentMethod"
      className={`bg-slate-200 dark:text-slate-300 dark:bg-slate-600 p-2 rounded-md font-bold ${className}`}
    >
      <p> পেমেন্ট মেথডঃ</p>
      <div className="flex flex-row gap-2">
        <RadioButton
          id="COD"
          name="paymentMethod"
          label="ক্যাশ অন ডেলিভারি"
          isSelected={selectedMethod === "COD"}
          onSelect={onChangeHandler}
        />
        <RadioButton
          id="BKASH"
          name="paymentMethod"
          label="Bkash"
          isSelected={selectedMethod === "BKASH"}
          onSelect={onChangeHandler}
        />
        {sslActive && (
          <>
            <RadioButton
              id="ONLINE"
              name="paymentMethod"
              label="Online/Card"
              isSelected={selectedMethod === "ONLINE"}
              onSelect={onChangeHandler}
            />

            <RadioButton
              id="EMI"
              name="paymentMethod"
              label="EMI"
              isSelected={selectedMethod === "EMI"}
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
