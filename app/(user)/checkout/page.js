import DeliveryAreaSelector from "@/components/checkout/DeliveryAreaSelector";
import { DefaultInput } from "@/components/defaultInput";
import { Truck } from "lucide-react";

export default async function CheckOutPage(props) {
  const { p } = await props.searchParams;
  return (
    <div className="pt-4">
      <div className="flex md:flex-nowrap flex-wrap-reverse  ">
        <div className="w-full md:w-1/2">Product Details</div>
        <div className="w-full md:w-1/2">
          <form className="max-w-md mx-auto">
            <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
              <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
            </div>
            <DefaultInput
              title={"আপনার নামঃ"}
              name={"name"}
              inputType={"text"}
            />

            <DefaultInput
              title={"আপনার ফোন নাম্বারঃ"}
              name={"number"}
              inputType={"text"}
              inputMode={"numeric"}
              pattern={"[0-9]*"}
            />
            <DefaultInput
              title={" ঠিকানাঃ"}
              name={"address"}
              inputType={"text"}
            />
            <DeliveryAreaSelector />
          </form>
        </div>
      </div>
    </div>
  );
}
