import FloatingInput from "../input/FloatingInput";
import DeliveryAreaSelector from "./DeliveryAreaSelector";

export default function DeliveryAddress({ setDeliveryArea }) {
  return (
    <address>
      <FloatingInput
        defaultvalue=""
        type={"text"}
        label={"আপনার নামঃ"}
        name={"customerName"}
        inputType={"text"}
        autoComplete="name"
      />
      <FloatingInput
        defaultvalue=""
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
        label={"ঠিকানাঃ"}
        name={"deliveryAddress"}
        inputType={"text"}
        autoComplete="address-line1"
      />

      <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
    </address>
  );
}
