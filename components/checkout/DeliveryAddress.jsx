// import bdLocation from "@/utils/data/bd-location.json";
import { useState } from "react";
import FloatingInput from "../input/FloatingInput";
import SearchableDropdown from "../input/SearchableDropdown";

export default function DeliveryAddress({ setDeliveryArea }) {
  // Use null for initial state to be more explicit about "no selection"
  const [division, setDivision] = useState(null);
  const [district, setDistrict] = useState(null);
  const [upazila, setUpazila] = useState(null);

  // 1. Handler for Division selection
  const handleDivisionChange = (selectedDivision) => {
    setDivision(selectedDivision);
    // When division changes, reset district and upazila
    setDistrict(null);
    setUpazila(null);
  };

  // 2. Handler for District selection
  const handleDistrictChange = (selectedDistrict) => {
    setDistrict(selectedDistrict);
    setUpazila(null);
    setDeliveryArea(selectedDistrict?.name.toLowerCase() || ""); // Set delivery area based on district
    // When district changes, reset upazila
  };

  // In DeliveryAddress.jsx

  const loadDivisionList = async () => {
    // 1. Await the dynamic import to get the module object
    const module = await import("@/utils/data/bd-location-bn.json");

    // 2. Access the JSON content via the `default` property
    const bdLocation = module.default;

    // 3. Now, bdLocation is the object you expect, and you can map its `divisions`
    return bdLocation.divisions.map((division) => ({
      id: division.name.toLowerCase(),
      name: division.name,
      districts: division.districts,
    }));
  };

  console.log("district", district);

  return (
    <address className="grid grid-cols-2 gap-1">
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার নামঃ *"}
        name={"customerName"}
        inputType={"text"}
        autoComplete="name"
        colSpan={"full"}
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ফোন নাম্বারঃ *"}
        name={"phoneNumber"}
        inputType={"text"}
        inputMode={"numeric"}
        autoComplete="tel"
        colSpan={"full"}
      />

      <SearchableDropdown
        defaultId={""}
        label={"আপনার বিভাগঃ *"}
        name="division"
        loadLists={loadDivisionList}
        onSelect={handleDivisionChange}
        dropDownLists={[]} // Initially empty, will be loaded dynamically
        // dropDownLists={bdLocation.divisions.map((division) => ({
        //   id: division.name.toLowerCase(),
        //   name: division.name,
        //   districts: division.districts,
        // }))}
        autoComplete="address-level1"
        colSpan={"full"}
      />

      <SearchableDropdown
        defaultId={division?.id || ""}
        label={"আপনার জেলাঃ *"}
        name="district"
        onSelect={handleDistrictChange}
        dropDownLists={
          division
            ? division.districts.map((district) => ({
                id: district.name.toLowerCase(),
                name: district.name,
                upazilas: district.upazilas,
              }))
            : []
        }
        autoComplete="address-level2"
      />

      <SearchableDropdown
        defaultId={district?.id || ""}
        label={"আপনার উপজেলা"}
        name="upazila"
        onSelect={setUpazila}
        dropDownLists={
          district && district.upazilas.length > 0
            ? district.upazilas
                .map((upazila) => ({
                  id: upazila?.name
                    ? upazila.name.toLowerCase()
                    : upazila.toLowerCase(),
                  name: upazila?.name ? upazila.name : upazila,
                }))
                .sort((a, b) => a.name.localeCompare(b.name))
            : []
        }
        autoComplete="address-level3"
      />

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"বাসা/রাস্তাঃ *"}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
        colSpan={"full"}
        placeholder="                              যেমনঃ বাড়ির নাম, রোড নাম্বার, ব্লক ইত্যাদি"
      />

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"অর্ডার নোটঃ"}
        name={"note"}
        inputType={"text"}
        colSpan={"full"}
      />

      {/* <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} /> */}
    </address>
  );
}
