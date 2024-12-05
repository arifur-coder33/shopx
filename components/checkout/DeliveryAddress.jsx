import DefaultInput from "../defaultInput";
import DeliveryAreaSelector from "./DeliveryAreaSelector";

export default function DeliveryAddress({ setDeliveryArea }) {
  return (
    <>
      <DefaultInput
        title={"আপনার নামঃ"}
        name={"customerName"}
        inputType={"text"}
      />

      <DefaultInput
        title={"আপনার ফোন নাম্বারঃ"}
        name={"phoneNumber"}
        inputType={"text"}
        inputMode={"numeric"}
        pattern={"[0-9]*"}
      />
      <DefaultInput
        title={" ঠিকানাঃ"}
        name={"deliveryAddress"}
        inputType={"text"}
      />
      <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
    </>
  );
}
