import DefaultInput from "../defaultInput";
import DeliveryAreaSelector from "./DeliveryAreaSelector";

export default function DeliveryAddress({ setDeliveryArea }) {
  return (
    <>
      <DefaultInput title={"আপনার নামঃ"} name={"name"} inputType={"text"} />

      <DefaultInput
        title={"আপনার ফোন নাম্বারঃ"}
        name={"number"}
        inputType={"text"}
        inputMode={"numeric"}
        pattern={"[0-9]*"}
      />
      <DefaultInput title={" ঠিকানাঃ"} name={"address"} inputType={"text"} />
      <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
    </>
  );
}
