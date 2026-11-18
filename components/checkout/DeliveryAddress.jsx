import FloatingInput from "../input/FloatingInput";
import PhoneInput from "../input/PhoneInput";
// const loadDivisionList = async () => {
//   const location = await import("@/utils/data/bangladesh-all-thanas.json");

//   return {
//     data: location.default.map((division) => ({
//       id: division.division_en,
//       name: division.division_bn,
//       searchText: `${division.division_bn} ${division.division_en}`,
//       districts: division.districts,
//     })),
//   };
// };

export default function DeliveryAddress() {
  // const [division, setDivision] = useState(null);
  // const [district, setDistrict] = useState(null);
  // const [thana, setThana] = useState(null);

  // const handleDivisionChange = (selectedDivision) => {
  //   setDivision(selectedDivision);
  //   setDistrict(null);
  //   setThana(null);
  // };

  // const handleDistrictChange = (selectedDistrict) => {
  //   setDeliveryArea(
  //     selectedDistrict?.id.toLowerCase() === "dhaka"
  //       ? "inside-dhaka"
  //       : "outside-dhaka",
  //   );
  //   setDistrict(selectedDistrict);
  //   setThana(null);
  // };

  // const handleThanaChange = (selectedThana) => {
  //   setThana(selectedThana);
  // };

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

      {/* <SearchableDropdown
        defaultId={division}
        label={"আপনার বিভাগঃ *"}
        name="division"
        onSelect={handleDivisionChange}
        loadLists={loadDivisionList}
        colSpan={"1"}
        largeMobile
      />
      <SearchableDropdown
        defaultId={district}
        label={"আপনার জেলাঃ *"}
        name="district"
        onSelect={handleDistrictChange}
        colSpan={"1"}
        dropDownLists={
          division
            ? division.districts.map((district) => ({
                id: district.district_en,
                name: district.district_bn,
                searchText: `${district.district_bn} ${district.district_en}`,
                thanas: district.thanas,
              }))
            : []
        }
        largeMobile
      />

      <SearchableDropdown
        colSpan={"full"}
        defaultId={thana}
        label={"আপনার থানা *"}
        name="thana"
        onSelect={handleThanaChange}
        required={true}
        largeMobile
        dropDownLists={
          district
            ? district.thanas.map((item) => ({
                id: item.thana_en,
                name: item.thana_bn,
                searchText: `${item.thana_bn} ${item.thana_en}`,
              }))
            : []
        }
      /> */}
      <FloatingInput
        defaultValue=""
        type={"text"}
        label="ডেলিভারি ঠিকানা "
        name={"deliveryAddress"}
        inputType={"text"}
        inputClassName="placeholder:text-base md:placeholder:text-lg"
        autoComplete="address-line1"
        colSpan={"full"}
        placeholder="বাসা/রোড/এলাকা, থানা ও জেলা লিখুন"
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

      {/* <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} /> */}
    </address>
  );
}
