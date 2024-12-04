"use client";
import DeliveryAddress from "@/components/checkout/DeliveryAddress";
import { Truck } from "lucide-react";
import { useSession } from "next-auth/react"
import BuyNowProductDetails from "./BuyNowProductDetails";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createOrder } from "@/backend/serverActions/orderActions";
import Button from "@/components/button";
export default function BuyNowCheckout({ data }) {
  const { data: session } = useSession()
  const [deliveryArea, setDeliveryArea] = useState('outside-dhaka');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const deliveryCharge = deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    formData.append('quantity','1')
    formData.append('productId',data?.id)
    formData.append('deliveryCharge',deliveryCharge)
    formData.append('userId',session?.user?.name)
    formData.append('orderPrice',data?.discountPrice+deliveryCharge)
    

    setError(null);
    setSuccess(null);

    startTransition(async () => {
    
      const response = await createOrder(formData); // Call server action
      console.log(response);
      if (response.success) {
        setSuccess("Registration successful!");
        form.reset(); // Clear the form on success
      } else {
        console.log(response.error);
        setError(response.error || "Something went wrong");
      }
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3  ">
        <div className="w-full md:w-1/2">
          <BuyNowProductDetails
            data={data}
            deliveryArea={deliveryArea}
           
          />
        </div>
        <div className="w-full md:w-1/2">
          <div className=" mx-auto">
            <div className="w-full rounded-sm flex flex-row gap-1 font-bold border-b-slate-400  border-b-2 dark:border-b-2 dark:border-b-slate-600 bg-slate-300 dark:bg-slate-800 p-2">
              <Truck /> <span>ডেলিভারি ঠিকানাঃ</span>
            </div>
            <DeliveryAddress setDeliveryArea={setDeliveryArea} />
          </div>
        </div>
      </div>
      <Button className="w-full z-30 bg-purple p-2 sticky bottom-0 left-0 border-b-8 border-b-purple-800 rounded-lg text-center cursor-pointer hover:border-b-0 my-1.5 text-slate-200 ">
        {isPending ? "Adding ......" : "save Product"}
      </Button>
    </form>
  );
}
