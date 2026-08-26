// import bdLocation from "@/utils/data/bd-location.json";
import { useState } from "react";
import FloatingInput from "../input/FloatingInput";
import PhoneInput from "../input/PhoneInput";
const loadDivisionList = async () => {
  // const location = await import("@/utils/data/bd-location-bn.json");

  const location = await import("@/utils/data/bangladesh-location.json");

  return {
    data: location.default.map((division) => ({
      id: division.division_en.toLowerCase(),
      name: division.division_bn,
      districts: division.districts,
    })),
  };
};

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

  const handleDistrictChange = (selectedDistrict) => {
    setDistrict(selectedDistrict);
    setUpazila(null);
  };

  const handleUpzillaChange = (selectedUpzilla) => {
    console.log(selectedUpzilla);
    setUpazila(selectedUpzilla);

    // When district changes, reset upazila
  };
  // In DeliveryAddress.jsx

  return (
    <address className="grid grid-cols-2 gap-3 ">
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

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার জেলাঃ *"}
        name={"district"}
        inputType={"text"}
        autoComplete="address-level1"
        colSpan={"full"}
        required={true}
      />

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার থানা/উপজেলা *"}
        name={"thana"}
        inputType={"text"}
        autoComplete="address-level2"
        colSpan={"full"}
        required={true}
      />
      {/* <SearchableDropdown
        defaultId={district}
        label={"আপনার জেলাঃ *"}
        name="district"
        onSelect={handleDistrictChange}
        dropDownLists={
          division
            ? division.districts.map((district) => ({
                id: district.district_en.toLowerCase(),
                name: district.district_bn,
                upazilas: district.upazilas,
              }))
            : []
        }
        searchOff={true}
        // autoComplete="address-level2"
      /> */}

      {/* <SearchableDropdown
        colSpan={"full"}
        defaultId={upazila}
        label={"আপনার থানা/ উপজেলা *"}
        name="thana"
        onSelect={handleUpzillaChange}
        dropDownLists={
          district
            ? district.upazilas.map((upzilla) => ({
                id: upzilla.en.toLowerCase(),
                name: upzilla.bn,
              }))
            : []
        }
        searchOff={true}
        // autoComplete="address-level2"
      /> */}

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"ডেলিভারি ঠিকানা "}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
        colSpan={"full"}
        placeholder=" বাসা/ফ্ল্যাট/রোড/ "
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
