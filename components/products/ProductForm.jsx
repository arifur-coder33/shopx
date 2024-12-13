"use client";

import {
  createProductAction,
  updateProductAction,
} from "@/backend/serverActions/productActions";
import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import CustomEditor from "../input/CustomEditor";
import SelectInput from "../input/SelectInput";
export default function ProductForm({ category, data, actionType }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editorValue, setEditorValue] = useState(data?.description);
  const [mainImage, setMainImage] = useState(data?.mainImage);
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
      const response =
        actionType === "edit"
          ? await updateProductAction({
              productId: data?.id,
              formData: formData,
              slug: data?.slug,
            })
          : await createProductAction(formData); // Call server action
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
    <form onSubmit={handleSubmit} className="relative">
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
          {" "}
          {error}{" "}
        </div>
      )}
      <div className="md:grid md:grid-cols-6 gap-2 ">
        <FloatingInput
          value={data?.title}
          label={"Product Name"}
          name={"title"}
          type={"text"}
          colSpan="full"
        />
        <FloatingInput
          value={data?.slug}
          label={"Product Slug In english"}
          name={"slug"}
          type={"text"}
          colSpan="full"
        />
        <div className="md:col-span-2">
          <SelectInput
            value={data?.categoryId}
            label={"Catagory"}
            name={actionType === "edit" ? "category" : "categoryId"}
            type={"text"}
            data={category}
          />
        </div>
        <FloatingInput
          label={"Regular Price"}
          name={"regularPrice"}
          type={"number"}
          value={data?.regularPrice}
          colSpan="2"
        />

        <FloatingInput
          label={"Discount Price"}
          name={"discountPrice"}
          type={"number"}
          value={data?.discountPrice}
          colSpan="2"
        />
        <FloatingInput
          label={"In side dhaka Delivery Charge"}
          name={"insideDhaka"}
          type={"text"}
          value={data?.insideDhaka}
          colSpan="2"
        />
        <FloatingInput
          label={"out side dhaka delivery charge"}
          name={"outSideDhaka"}
          type={"text"}
          value={data?.outSideDhaka}
          colSpan="2"
        />
        <FloatingInput
          label={"Product Weight"}
          name={"weight"}
          type={"text"}
          value={data?.weight}
          colSpan="2"
        />

        <FloatingInput
          label={"Main Image"}
          name={"mainImage"}
          type={"file"}
          value={data?.mainImage}
          colSpan={"full"}
        />
        {mainImage && (
          <Image
            className="col-span-full"
            width={300}
            height={300}
            src={mainImage}
            alt="mainImage"
          />
        )}
        <FloatingInput
          label={"SEO Key Word"}
          name={"seoKeyWord"}
          type={"text"}
          value={data?.seoKeyWord}
          colSpan={"full"}
        />

        <FloatingInput
          label={"Seo Product Deacription (max-160 letter)"}
          name={"seoDescription"}
          type={"text"}
          value={data?.seoDescription}
          colSpan={"full"}
        />
        <div className="col-span-full">
          <CustomEditor
            label={"Description"}
            name={"description"}
            editorValue={editorValue}
            setEditorValue={setEditorValue}
          />
        </div>

        <Button disabled={isPending} className="w-full mt-2 py-2 col-span-full">
          {isPending ? "Adding ......" : "Save"}
        </Button>
        <Button
          disabled={isPending}
          className=" mt-2 p-2 absolute md:-top-12 -top-14 right-0"
        >
          {isPending ? "Saving ......" : "Save"}
        </Button>
      </div>
    </form>
  );
}
