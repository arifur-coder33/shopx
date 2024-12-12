"use client";

import { updateProductAction } from "@/backend/serverActions/productActions";
import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import CustomEditor from "../input/CustomEditor";
import SelectInput from "../input/SelectInput";
export default function EditProductForm({ category, data }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editorValue, setEditorValue] = useState(data?.description);
  const router = useRouter();
  console.log(data);
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    formData.append("description", editorValue);
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await updateProductAction({
        productId: data?.id,
        formData: formData,
        slug: data?.slug,
      }); // Call server action
      console.log(response);
      if (response.success) {
        form.reset(); // Clear the form on success
        router.push("/admin/product");
        setSuccess(response?.message);
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

      <FloatingInput
        value={data?.title}
        label={"Product Name"}
        name={"title"}
        type={"text"}
      />

      <SelectInput
        value={data?.categoryId}
        label={"Catagory"}
        name={"category"}
        type={"text"}
        data={category}
      />
      <FloatingInput
        label={"Regular Price"}
        name={"regularPrice"}
        type={"number"}
        value={data?.regularPrice}
      />

      <FloatingInput
        label={"Discount Price"}
        name={"discountPrice"}
        type={"number"}
        value={data?.discountPrice}
      />
      <FloatingInput
        label={"In side dhaka Delivery Charge"}
        name={"insideDhaka"}
        type={"text"}
        value={data?.insideDhaka}
      />
      <FloatingInput
        label={"out side dhaka delivery charge"}
        name={"outSideDhaka"}
        type={"text"}
        value={data?.outSideDhaka}
      />
      <FloatingInput
        label={"Product Weight"}
        name={"weight"}
        type={"text"}
        value={data?.weight}
      />

      <FloatingInput
        label={"Main Image"}
        name={"mainImage"}
        type={"text"}
        value={data?.mainImage}
      />

      <CustomEditor
        label={"Description"}
        name={"description"}
        editorValue={editorValue}
        setEditorValue={setEditorValue}
      />

      <Button className="w-full mt-2 py-2">
        {isPending ? "Adding ......" : "save Product"}
      </Button>
    </form>
  );
}
