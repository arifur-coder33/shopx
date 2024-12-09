"use client";

import { createProductAction, getProductById } from "@/backend/serverActions/productActions";
import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import SelectInput from "../input/SelectInput";
export default function AddProductForm({category,data}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await createProductAction(formData); // Call server action
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
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
          {" "}
          {error}{" "}
        </div>
      )}

      <FloatingInput label={"Product Name"} name={"title"} type={"text"} />

      <SelectInput label={'Catagory'} name={'categoryId'} type={'text'} data={category}/>
      <FloatingInput
        label={"Regular Price"}
        name={"regularPrice"}
        type={"number"}
      />

      <FloatingInput
        label={"Discount Price"}
        name={"discountPrice"}
        type={"number"}
      />
      <FloatingInput
        label={"In side dhaka Delivery Charge"}
        name={"insideDhaka"}
        type={"text"}
      />
      <FloatingInput
        label={"out side dhaka delivery charge"}
        name={"outSideDhaka"}
        type={"text"}
      />
      <FloatingInput label={"Product Weight"} name={"weight"} type={"text"} />
      <FloatingInput
        label={"Product Description"}
        name={"description"}
        type={"textArea"}
      />

      <FloatingInput label={"Photo"} name={"images"} type={"text"} />
      <Button className="w-full mt-2 py-2">
        {isPending ? "Adding ......" : "save Product"}
      </Button>
    </form>
  );
}
