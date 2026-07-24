// import bdLocation from "@/utils/data/bd-location.json";
import { useState } from "react";
import FloatingInput from "../input/FloatingInput";
import PhoneInput from "../input/PhoneInput";
import SearchableDropdown from "../input/SearchableDropdown";

export default function DeliveryAddress({ setDeliveryArea }) {
  // Use null for initial state to be more explicit about "no selection"
  const [division, setDivision] = useState(null);
  const [district, setDistrict] = useState(null);
  const [upazila, setUpazila] = useState(null);

  // useEffect(() => {
  //   const fetchCities = async () => {
  //     try {
  //       const data = await getCities_Pathao();
  //       console.log("Cities:", data);
  //     } catch (error) {
  //       console.error("Failed to fetch cities:", error);
  //     }
  //   };

  //   fetchCities();
  // }, []);

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
    const location = await import("@/utils/data/bd-location-bn.json");

    return {
      data: location.default.divisions.map((division) => ({
        id: division.name.toLowerCase(),
        name: division.name,
        districts: division.districts,
      })),
    };
  };

  return (
    <address className="grid grid-cols-2">
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার নামঃ "}
        name={"customerName"}
        inputType={"text"}
        autoComplete="name"
        colSpan={"full"}
        required={true}
      />

      <PhoneInput
        defaultValue=""
        label="আপনার ফোন নাম্বারঃ (১১ ডিজিট)"
        name="phoneNumber"
        inputType="text"
        inputMode="numeric"
        autoComplete="tel"
        colSpan="full"
        max={11}
        min={11}
        required
      />

      <SearchableDropdown
        defaultId={division}
        label={"আপনার বিভাগঃ *"}
        name="division"
        loadLists={loadDivisionList}
        onSelect={handleDivisionChange}
        // dropDownLists={loadDivisionList} // Initially empty, will be loaded dynamically
        //   dropDownLists={loadDivisionList.divisions.map((division) => ({
        //     id: division.name.toLowerCase(),
        //     name: division.name,
        //     districts: division.districts,
        //   }))}
        //   autoComplete="address-level1"
        //   searchOff={true}
      />

      <SearchableDropdown
        defaultId={district}
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
        searchOff={true}
        // autoComplete="address-level2"
      />

      {/* <SearchableDropdown
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
        searchOff={true}
      /> */}

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"ডেলিভারি ঠিকানা "}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
        colSpan={"full"}
        placeholder="                                   বাসা/ফ্ল্যাট/রোড/ উপজেলা "
        required={true}
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ইমেইলঃ (অপশনাল)"}
        name={"email"}
        inputType={"email"}
        autoComplete="email"
        colSpan={"full"}
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"অর্ডার নোটঃ (অপশনাল)"}
        name={"note"}
        inputType={"text"}
        colSpan={"full"}
      />

      {/* <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} /> */}
    </address>
  );
}
