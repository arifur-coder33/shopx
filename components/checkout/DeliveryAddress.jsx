"use client";

import { useEffect, useState } from "react";
import FloatingInput from "../input/FloatingInput";
import PhoneInput from "../input/PhoneInput";

export default function DeliveryAddress({
  initialLocation,
  onLocationChange,
  setDeliveryArea,
}) {
  const [district, setDistrict] = useState(initialLocation?.district || "");
  const [thana, setThana] = useState(initialLocation?.thana || "");

  useEffect(() => {
    setDistrict(initialLocation?.district || "");
    setThana(initialLocation?.thana || "");
  }, [initialLocation]);

  function updateDistrict(value) {
    setDistrict(value);
    const normalized = value.trim().toLocaleLowerCase();
    const nextArea =
      /^(?:ঢাকা(?:\s+জেলা|\s+শহর|\s+সিটি)?|dhaka(?:\s+district|\s+city|\s+zilla)?|dacca)$/u.test(
        normalized,
      )
        ? "inside-dhaka"
        : value.trim()
          ? "outside-dhaka"
          : undefined;
    if (nextArea) setDeliveryArea?.(nextArea);
    onLocationChange?.({ district: value, thana }, nextArea);
  }

  function updateThana(value) {
    setThana(value);
    onLocationChange?.({ district, thana: value });
  }

  return (
    <address className="grid grid-cols-2 md:grid-cols-2 gap-3 pt-3 mb-2">
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার নামঃ "}
        name={"customerName"}
        inputType={"text"}
        autoComplete="name"
        colSpan={"full"}
        required={true}
        largeMobile
      />

      <PhoneInput
        defaultValue=""
        label="আপনার ফোন নাম্বারঃ"
        name="phoneNumber"
        inputType="text"
        inputMode="numeric"
        autoComplete="tel"
        colSpan={"full"}
        max={11}
        min={11}
        required
        largeMobile
      />

      <FloatingInput
        name="district"
        label="জেলা লিখুন"
        value={district}
        onChange={(event) => updateDistrict(event.target.value)}
        inputType="text"
        autoComplete="address-level2"
        maxLength={100}
        required
        largeMobile
      />
      <FloatingInput
        name="thana"
        label="থানা/উপজেলা"
        value={thana}
        onChange={(event) => updateThana(event.target.value)}
        inputType="text"
        autoComplete="address-level3"
        maxLength={100}
        required
        largeMobile
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label="বাসা/রোড/এলাকা লিখুন "
        name={"deliveryAddress"}
        inputType={"text"}
        inputClassName="placeholder:text-base md:placeholder:text-lg"
        autoComplete="address-line1"
        colSpan={"full"}
        // placeholder="বাসা/রোড/এলাকা লিখুন"
        required={true}
        largeMobile
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ইমেইলঃ (অপশনাল)"}
        name={"email"}
        inputType={"email"}
        autoComplete="email"
        colSpan={"full"}
        largeMobile
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"অর্ডার নোটঃ (অপশনাল)"}
        name={"note"}
        inputType={"text"}
        colSpan={"full"}
        largeMobile
      />
    </address>
  );
}
