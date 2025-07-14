import FloatingInput from "../input/FloatingInput";
import SearchableDropdown from "../input/SearchableDropdown";

export default function DeliveryAddress({ setDeliveryArea }) {
  return (
    <address>
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার নামঃ"}
        name={"customerName"}
        inputType={"text"}
        autoComplete="name"
      />
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ফোন নাম্বারঃ"}
        name={"phoneNumber"}
        inputType={"text"}
        inputMode={"numeric"}
        autoComplete="tel"
      />

      <SearchableDropdown
        defaultId=""
        label={"আপনার সিটী"}
        name="city"
        onSelect={setDeliveryArea}
        dropDownLists={[
          { id: 1, name: "ঢাকা" },
          { id: 2, name: "চট্টগ্রাম" },
          { id: 3, name: "রাজশাহী" },
          { id: 4, name: "খুলনা" },
          { id: 5, name: "বরিশাল" },
          { id: 6, name: "সিলেট" },
          { id: 7, name: "রংপুর" },
          { id: 8, name: "কুমিল্লা" },
        ]}
        autoComplete="city"
      />

      {/* <SearchableDropdown
        defaultId=""
        label={"আপনার জোন"}
        name="zone"
        dropDownLists={[
          { id: 1, name: "ঢাকা" },
          { id: 2, name: "চট্টগ্রাম" },
          { id: 3, name: "রাজশাহী" },
          { id: 4, name: "খুলনা" },
          { id: 5, name: "বরিশাল" },
          { id: 6, name: "সিলেট" },
          { id: 7, name: "রংপুর" },
          { id: 8, name: "কুমিল্লা" },
        ]}
      /> */}
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"ঠিকানাঃ"}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
      />

      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"অর্ডার নোটঃ"}
        name={"note"}
        inputType={"text"}
      />

      {/* <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} /> */}
    </address>
  );
}
