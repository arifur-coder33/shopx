import { Truck } from "lucide-react";
import Button from "../button";
import DeliveryAddress from "./DeliveryAddress";

import { useSession } from "next-auth/react";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PaymentMethodSelector from "./PaymentMethodSelector";
export default function OrderForm({
  setDeliveryArea,
  children,
  products,
  buyNow,
  deliveryCharge,
  data,
  initialQty,
  variationId,
}) {
  const { data: session } = useSession();

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const router = useRouter();
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission

    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    // if (buyNow) {
    //   products[0].quantity = Number(formData.get("quantity"));
    // }

    if (session?.user?.id) {
      formData.append("userId", session?.user?.id);
    }

    formData.append("paymentMethod", paymentMethod);

    formData.delete("quantity");
    formData.append("products", JSON.stringify(products));
    console.log(products);
    // formData.append("deliveryArea", deliveryArea);
    setError(null);
    setSuccess(null);
    console.log("Form Data:", Object.fromEntries(formData.entries()));
    // startTransition(async () => {
    //   const response = await createOrder(formData); // Call server action

    //   if (response.success) {
    //     trackFacebookEvent("Purchase", {
    //       content_type: "product",
    //       content_ids: products.map((product) => product.productId),
    //       value: products.reduce(
    //         (total, product) => total + product.quantity * product.price,
    //         0
    //       ),
    //       currency: "BDT", // Bangladeshi Taka
    //     });

    //     router.push(
    //       `/tracking/${response?.data?.orderNo}?p=${encodeURIComponent(
    //         response?.data?.phoneNumber
    //       )}&orderSuccess=true`
    //     );

    //     // form.reset(); // Clear the form on success
    //   } else {
    //     console.log(response.error);
    //     // Track the "FailedOrder" event
    //     console.log(products);
    //     trackFacebookEvent("FailedOrder", {
    //       content_type: "product",
    //       content_ids: products.map((product) => product.productId),
    //       value: products.reduce(
    //         (total, product) => total + product.quantity * product.price,
    //         0
    //       ),
    //       currency: "BDT",
    //       reason: response.error || "Unknown error",
    //     });
    //     window.scrollTo(0, 0);
    //     setError(response.error || "Something went wrong");
    //   }
    // });
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
          {/* <BuyNowProductDetails
              data={data}
              initialQty={initialQty}
              deliveryArea={deliveryArea}
              setPaymentMethod={setPaymentMethod}
            /> */}
          {children}
          <PaymentMethodSelector
            className="mt-2"
            setPaymentMethod={setPaymentMethod}
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
      <Button
        type={"submit"}
        className="w-full z-30 bg-purple p-2 sticky bottom-0 left-0।। rounded-lg text-center cursor-pointer hover:border-b-0 my-1.5 text-slate-200 "
      >
        {isPending ? "অর্ডার নিশ্চিত হচ্ছে " : "অর্ডার নিশ্চিত করুন"}
      </Button>
    </form>
  );
}
