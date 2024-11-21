"use client";
import { useState } from "react";
import RadioButton from "../RadioButton";

function DeliveryAreaSelector() {
  const [selectedArea, setSelectedArea] = useState(null);

  return (
    <div className="bg-slate-200 dark:text-slate-300 dark:bg-slate-600 p-2 rounded-md font-bold">
      <p>ডেলিভারি ঠিকানা কি ঢাকা জেলার ভিতরে?</p>
      <div className="flex flex-row gap-2">
        <RadioButton
          id="inside-dhaka"
          name="delivery-area"
          label="হ্যা। ঢাকার ভিতরে।"
          isSelected={selectedArea === "inside-dhaka"}
          onSelect={setSelectedArea}
        />
        <RadioButton
          id="outside-dhaka"
          name="delivery-area"
          label="না। ঢাকার বাহিরে"
          isSelected={selectedArea === "outside-dhaka"}
          onSelect={setSelectedArea}
        />
      </div>
    </div>
  );
}

export default DeliveryAreaSelector;
