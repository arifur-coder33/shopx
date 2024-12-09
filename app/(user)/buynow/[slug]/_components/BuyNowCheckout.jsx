"use client";
import { createOrder } from "@/backend/serverActions/orderActions";
import Button from "@/components/button";
import DeliveryAddress from "@/components/checkout/DeliveryAddress";
import { Truck } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import BuyNowProductDetails from "./BuyNowProductDetails";
export default function BuyNowCheckout({ data }) {
  const { data: session } = useSession();
  const [deliveryArea, setDeliveryArea] = useState("outside-dhaka");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const deliveryCharge =
      deliveryArea === "inside-dhaka" ? data?.insideDhaka : data?.outSideDhaka;
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    formData.append("quantity", Number(1));
    formData.append("productId", data?.id);
    formData.append("deliveryCharge", Number(deliveryCharge));
    if (session?.user?.id) {
      formData.append("userId", session?.user?.id);
    }

    formData.append("orderPrice", Number(data?.discountPrice + deliveryCharge));
    formData.append("productName", data?.title);
    formData.append("productColor", data?.color);
    formData.append("productSize", data?.size);

    // formData.append("deliveryArea", deliveryArea);
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await createOrder(formData); // Call server action
      console.log(response);
      if (response.success) {
        setSuccess(
          `আপনার অর্ডারটি সঠিক ভাভে করা হয়েছে। অর্ডার নাম্বার হলঃ ${response?.data?.orderNo}`
        );
        form.reset(); // Clear the form on success
      } else {
        console.log(response.error);
        setError(response.error || "Something went wrong");
      }
      window.scrollTo(0, 0);
    });
  };
  return (
    <form onSubmit={handleSubmit}>
      <div className="w-full mb-2">
        {success && <p style={{ color: "green" }}>{success}</p>}
        {error && (
          <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
            {" "}
            {error}{" "}
          </div>
        )}
      </div>
      <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3  ">
        <div className="w-full md:w-1/2">
          <BuyNowProductDetails data={data} deliveryArea={deliveryArea} />
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
      <Button className="w-full z-30 bg-purple p-2 sticky bottom-0 left-0।। rounded-lg text-center cursor-pointer hover:border-b-0 my-1.5 text-slate-200 ">
        {isPending ? "অর্ডার নিশ্চিত হচ্ছে " : "অর্ডার নিশ্চিত করুন"}
      </Button>
    </form>
  );
}
