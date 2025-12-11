import FloatingInput from "../input/FloatingInput";
import DeliveryAreaSelector from "./DeliveryAreaSelector";

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
      <FloatingInput
        defaultValue=""
        type={"text"}
        label={"আপনার ইমেইল (ঐচ্ছিক)"}
        name={"email"}
        inputType={"email"}
        inputMode={"numeric"}
        autoComplete="email"
      />
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
        label={"ডেলিভারি সংক্রান্ত নোট (ঐচ্ছিক)"}
        name={"orderNotes"}
        inputType={"text"}
      />

      <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
    </address>
  );
}
