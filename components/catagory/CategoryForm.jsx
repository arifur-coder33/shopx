"use client";

import { createCategoryAction } from "@/backend/serverActions/catagoryActions";
import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Imagecustom from "../images/ImageCustom";
import SelectInput from "../input/SelectInput";
export default function CategoryForm({ data, category }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();
  const [mainImage, setMainImage] = useState(data?.mainImage);
  const [uploadedMainimage, setUploadedMainImage] = useState();
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    const form = e.target; // Reference to the form element
    const formData = new FormData(form); // Collect form data
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const response = await createCategoryAction(formData); // Call server action

      if (response.success) {
        setSuccess("Category Added successful!");
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
      <div className="md:grid md:grid-cols-6 gap-2">
        <FloatingInput
          label={"Category Name"}
          name={"name"}
          type={"text"}
          colSpan="3"
        />
        <FloatingInput
          label={"Category in english"}
          name={"slug"}
          type={"text"}
          colSpan="3"
        />

        <div className="flex gap-6 col-span-full">
          {uploadedMainimage && (
            <div className=" relative">
              <Image
                className="rounded-xl"
                width={100}
                height={100}
                src={uploadedMainimage}
                alt={`Category Thumbnil `}
              />
              <p className="border-2 text-center bg-slate-900 absolute bottom-0 left-0 text-[14px] opacity-70 w-[100px]">
                <span className="text-white">New image</span>
              </p>
            </div>
          )}

          {mainImage && (
            <>
              <div className="relative ">
                <Imagecustom w={100} h={100} src={mainImage} alt="Main Image" />
                <p className="border-2 text-center bg-slate-900 absolute bottom-0 left-0 text-[14px] opacity-70 w-[100px]">
                  <span className="text-white">Old image</span>
                </p>
              </div>
            </>
          )}
        </div>

        <div className="md:col-span-2">
          <SelectInput
            defaultValue={data?.categoryId}
            label={"Parent Category"}
            name={"parentCategory"}
            type={"text"}
            data={category}
          />
        </div>

        <FloatingInput
          label={"Category thumbnil"}
          name={"thumbnail"}
          type={"file"}
          colSpan={"full"}
          multiple
          onChange={(e) => handleImageGalleryChange(e.target.files)}
        />

        <FloatingInput
          label={"Category banner"}
          name={"banner"}
          type={"file"}
          colSpan={"full"}
          multiple
          onChange={(e) => handleImageGalleryChange(e.target.files)}
        />
      </div>
      <Button type={"submit"} className="w-full mt-2 py-2">
        {isPending ? "Adding ......" : "save "}
      </Button>
    </form>
  );
}
