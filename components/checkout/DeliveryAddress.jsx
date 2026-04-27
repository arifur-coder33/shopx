// import bdLocation from "@/utils/data/bd-location.json";
import { useState } from "react";
import FloatingInput from "../input/FloatingInput";

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
    // 1. Await the dynamic import to get the module object
    const location = await import("@/utils/data/bd-location-bn.json");

    // 2. Access the JSON content via the `default` property
    const bdLocation = location.default;

    // 3. Now, bdLocation is the object you expect, and you can map its `divisions`
    return bdLocation.divisions.map((division) => ({
      id: division.name.toLowerCase(),
      name: division.name,
      districts: division.districts,
    }));
  };

  return (
    <address className="grid grid-cols-2">
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

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ইমেইলঃ (optional)"}
        name={"email"}
        inputType={"email"}
        autoComplete="email"
        colSpan={"full"}
      />

      {/* <SearchableDropdown
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
        // autoComplete="address-level1"
        searchOff={true}
      /> */}

      {/* <SearchableDropdown
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
        searchOff={true}
        // autoComplete="address-level2"
      /> */}

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
        label={"ডেলিভারি ঠিকানা *"}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
        colSpan={"full"}
        placeholder="  "
      />

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"অর্ডার নোটঃ (optional)"}
        name={"note"}
        inputType={"text"}
        colSpan={"full"}
      />

      {/* <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} /> */}
    </address>
  );
}
