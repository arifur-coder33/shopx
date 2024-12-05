"use client";
import { useState } from "react";
import RadioButton from "../RadioButton";

function DeliveryAreaSelector({ setDeliveryArea }) {
  const [selectedArea, setSelectedArea] = useState("outside-dhaka");

  function onChangeArea(id) {
    setDeliveryArea(id);
    setSelectedArea(id);
  }

  return (
    <div className="bg-slate-200 dark:text-slate-300 dark:bg-slate-600 p-2 rounded-md font-bold">
      <p>ডেলিভারি ঠিকানা কি ঢাকা জেলার ভিতরে?</p>
      <div className="flex flex-row gap-2">
        <RadioButton
          id="inside-dhaka"
          name="deliveryArea"
          label="হ্যা। ঢাকার ভিতরে।"
          isSelected={selectedArea === "inside-dhaka"}
          onSelect={onChangeArea}
        />
        <RadioButton
          id="outside-dhaka"
          selected={true}
          name="deliveryArea"
          label="না। ঢাকার বাহিরে"
          isSelected={selectedArea === "outside-dhaka"}
          onSelect={onChangeArea}
        />
      </div>
    </div>
  );
}

export default DeliveryAreaSelector;
