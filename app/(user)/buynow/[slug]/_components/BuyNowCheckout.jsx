"use client";
import OrderForm from "@/components/checkout/OrderForm";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useState, useTransition } from "react";
import BuyNowProductDetails from "./BuyNowProductDetails";
export default function BuyNowCheckout({ data }) {
  const { data: session } = useSession();
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const searchParams = useSearchParams();
  const initialQty = searchParams.get("qty");
  const router = useRouter();

  return (
    <OrderForm
      deliveryArea={deliveryArea}
      setDeliveryArea={setDeliveryArea}
      data={data}
    >
      <BuyNowProductDetails
        data={data}
        initialQty={initialQty}
        deliveryArea={deliveryArea}
        setPaymentMethod={setPaymentMethod}
      />
    </OrderForm>
    // <form onSubmit={handleSubmit}>
    //   <div className="w-full mb-2">
    //     {success && <p style={{ color: "green" }}>{success}</p>}
    //     {error && (
    //       <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
    //         {" "}
    //         {error}{" "}
    //       </div>
    //     )}
    //   </div>
    //   <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3  ">
    //     <div className="w-full md:w-1/2">
    //       <BuyNowProductDetails
    //         data={data}
    //         initialQty={initialQty}
    //         deliveryArea={deliveryArea}
    //         setPaymentMethod={setPaymentMethod}
    //       />
    //     </div>
    //     <div className="w-full md:w-1/2">
    //       <div className=" mx-auto">
    //         <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
    //           <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
    //         </div>
    //         <DeliveryAddress setDeliveryArea={setDeliveryArea} />
    //       </div>
    //     </div>
    //   </div>
    //   <Button
    //     type={"submit"}
    //     className="w-full z-30 bg-purple p-2 sticky bottom-0 left-0।। rounded-lg text-center cursor-pointer hover:border-b-0 my-1.5 text-slate-200 "
    //   >
    //     {isPending ? "অর্ডার নিশ্চিত হচ্ছে " : "অর্ডার নিশ্চিত করুন"}
    //   </Button>
    // </form>
  );
}
