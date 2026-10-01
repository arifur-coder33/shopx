"use client";
import { Check, MapPin } from "lucide-react";

function DeliveryAreaSelector({ setDeliveryArea, selectedArea = "outside-dhaka", onSelectArea }) {
  function onChangeArea(id) {
    setDeliveryArea(id);
    onSelectArea?.(id);
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary sm:text-base">
        <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        ডেলিভারি ঠিকানা কি ঢাকা জেলার ভিতরে?
      </h3>
      <div role="radiogroup" aria-label="ডেলিভারি ঠিকানা ঢাকা জেলার ভিতরে কি না" className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {[
          { id: "inside-dhaka", label: "হ্যাঁ, ঢাকার ভিতরে" },
          { id: "outside-dhaka", label: "না, ঢাকার বাইরে" },
        ].map((option) => {
          const isSelected = selectedArea === option.id;
          return (
            <label
              key={option.id}
              htmlFor={option.id}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${isSelected ? "border-primary bg-primary-soft text-primary ring-1 ring-primary/25" : "border-border bg-surface text-text-secondary hover:border-primary/50 hover:bg-surface-muted"}`}
            >
              <input
                className="sr-only"
                type="radio"
                id={option.id}
                name="deliveryArea"
                value={option.id}
                checked={isSelected}
                onChange={() => onChangeArea(option.id)}
              />
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-primary bg-primary text-white" : "border-border bg-surface"}`} aria-hidden="true">
                {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default DeliveryAreaSelector;
