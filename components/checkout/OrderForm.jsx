'use client";';
import { Truck } from "lucide-react";
import Button from "../button";
import DeliveryAddress from "./DeliveryAddress";

import { initiateSSLcommerzPayment } from "@/backend/lib/payments/bkash/sslcommerz";
import { createOrder } from "@/backend/serverActions/orderActions";
import { useCart } from "@/context/CartContext";
import { getCookie } from "@/utils/cookie/cooike";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import LoadingSpinner from "../common/LoadingSpinner";
import DeliveryAreaSelector from "./DeliveryAreaSelector";
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
  deliveryArea,
  totalPrice,
  orderWeight,
}) {
  const { data: session } = useSession();
  const { clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setLoading(true);
    setError(null);
    setSuccess(null);
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    // if (buyNow) {
    //   products[0].quantity = Number(formData.get("quantity"));
    // }
    console.log();
    if (session?.user?.id) {
      formData.append("userId", session?.user?.id);
    }

    formData.append("paymentMethod", paymentMethod);
    formData.append("orderPrice", totalPrice);
    formData.append("deliveryCharge", deliveryCharge);
    formData.append("orderWeight", orderWeight);
    formData.append("fbp", getCookie("_fbp"));
    formData.append("fbc", getCookie("_fbc"));
    formData.append("gclid", getCookie("gclid"));
    formData.append("ttclid", getCookie("ttclid"));
    formData.append("userAgent", navigator.userAgent);
    formData.append("id", paymentMethod);
    formData.delete("quantity");
    formData.append("products", JSON.stringify(products));

    formData.append("deliveryArea", deliveryArea);
    const productPrice = products.reduce(
      (total, product) =>
        total +
        product.quantity * (product.discountPrice || product.regularPrice),
      0,
    );
    const formDataObj = Object.fromEntries(formData.entries());
    console.log("formdata", formDataObj);

    // startTransition(async () => {
    const response = await createOrder(formData); // Call server action

    if (response.success) {
      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
      if (!buyNow) clearCart();
      if (paymentMethod === "online") {
        const url = await initiateSSLcommerzPayment({
          amount: productPrice + deliveryCharge,
          name: response?.data?.customerName,
          email: data?.email,
          order_id: response?.data?.id,
        });

        if (url) {
          console.log("SSLCommerz URL:", url);
          setLoading(false);
          window.location.href = url;
        }
      } else {
        setLoading(false);
        router.push(
          `/tracking/${response?.data?.orderNo}?p=${encodeURIComponent(
            response?.data?.phoneNumber,
          )}&orderSuccess=true`,
        );
      }

      // trackFacebookEvent("Purchase", {
      //   content_type: "product",
      //   content_ids: products.map((product) => product.productId),
      //   value: productPrice,
      //   currency: "BDT", // Bangladeshi Taka
      // });

      // form.reset(); // Clear the form on success
    } else {
      console.log(response.error);

      window.scrollTo(0, 0);
      setError(response.error || "Something went wrong");
    }
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
      <div className="flex md:flex-nowrap flex-wrap-reverse md:gap-12 gap-3 text-base ">
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
            <>
              <DeliveryAddress setDeliveryArea={setDeliveryArea} />
              <DeliveryAreaSelector setDeliveryArea={setDeliveryArea} />
            </>
          </div>
        </div>
      </div>
      <Button
        type={"submit"}
        className="w-full z-30 bg-brand p-2 sticky bottom-2  left-0 border-b-4  border-slate-600 rounded-lg text-center hover:text-white cursor-pointer  my-1.5 text-slate-200 "
      >
        Place Order
      </Button>
      {loading && !error && (
        <div className="fixed top-0 left-0 w-screen h-screen bg-black bg-opacity-30 z-30 flex items-center justify-center">
          <LoadingSpinner message="অর্ডার নিশ্চিত হচ্ছে ..." />
        </div>
      )}
    </form>
  );
}
