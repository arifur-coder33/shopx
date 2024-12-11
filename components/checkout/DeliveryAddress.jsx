import FloatingInput from "../input/FloatingInput";
import DeliveryAreaSelector from "./DeliveryAreaSelector";

export default function DeliveryAddress({ setDeliveryArea }) {
  return (
    <>
      <FloatingInput
        value=""
        type={"text"}
        label={"আপনার নামঃ"}
        name={"customerName"}
        inputType={"text"}
      />
      <FloatingInput
        value=""
        type={"text"}
        label={"আপনার ফোন নাম্বারঃ"}
        name={"phoneNumber"}
        inputType={"text"}
        inputMode={"numeric"}
        pattern={"[0-9]*"}
      />
      <FloatingInput
        value=""
        type={"text"}
        label={"ঠিকানাঃ"}
        name={"deliveryAddress"}
        inputType={"text"}
      />

      <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
    </>
  );
}
