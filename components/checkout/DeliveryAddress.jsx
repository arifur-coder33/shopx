"use client";

import { useEffect, useMemo, useState } from "react";
import FloatingInput from "../input/FloatingInput";
import PhoneInput from "../input/PhoneInput";
import SearchableDropdown from "../input/SearchableDropdown";

let districtList;

function loadDistricts() {
  districtList ??= import("@/utils/data/bangladesh-all-thanas.json")
    .then(({ default: divisions }) => ({
      data: divisions
        .flatMap((division) =>
          division.districts.map((district) => ({
            id: district.district_en,
            name: district.district_bn,
            searchText: district.district_en,
            thanas: district.thanas.map((thana) => ({
              id: thana.thana_en,
              name: thana.thana_bn,
              searchText: thana.thana_en,
            })),
          })),
        )
        .sort((a, b) => a.name.localeCompare(b.name, "bn")),
    }))
    .catch(() => {
      districtList = undefined;
      return { data: [] };
    });
  return districtList;
}

export default function DeliveryAddress({
  initialLocation,
  onLocationChange,
  setDeliveryArea,
}) {
  const [location, setLocation] = useState(null);
  const { district, thana } = location || {};
  const thanas = useMemo(() => district?.thanas || [], [district]);

  useEffect(() => {
    if (!initialLocation?.district) return;
    let active = true;
    loadDistricts().then(({ data }) => {
      if (!active) return;
      const savedDistrict = data.find(
        (item) => item.id === initialLocation.district,
      );
      if (!savedDistrict) return;
      setLocation(
        (current) =>
          current ?? {
            district: savedDistrict,
            thana: savedDistrict.thanas.find(
              (item) => item.id === initialLocation.thana,
            ),
          },
      );
    });
    return () => {
      active = false;
    };
  }, [initialLocation]);

  function selectDistrict(nextDistrict) {
    if (nextDistrict?.id === district?.id) return;
    setLocation({ district: nextDistrict, thana: null });
    const nextArea = nextDistrict
      ? nextDistrict.id === "Dhaka"
        ? "inside-dhaka"
        : "outside-dhaka"
      : undefined;
    if (nextArea) setDeliveryArea?.(nextArea);
    onLocationChange?.(
      { district: nextDistrict?.id || "", thana: "" },
      nextArea,
    );
  }

  function selectThana(nextThana) {
    setLocation({ district, thana: nextThana });
    onLocationChange?.({
      district: district?.id || "",
      thana: nextThana?.id || "",
    });
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

      <SearchableDropdown
        name="district"
        label="জেলা "
        defaultId={district}
        loadLists={loadDistricts}
        onSelect={selectDistrict}
        onClear={() => selectDistrict(null)}
        required={true}
      />
      <SearchableDropdown
        key={district?.id || "no-district"}
        name="thana"
        label="থানা/উপজেলা"
        defaultId={thana}
        dropDownLists={thanas}
        onSelect={selectThana}
        onClear={() => selectThana(null)}
        disabled={!district}
        required={true}
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
