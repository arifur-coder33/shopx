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
import { toast } from "react-toastify";
import Imagecustom from "../images/ImageCustom";
import CheckBox from "../input/CheckBox";
import CustomEditor from "../input/CustomEditor";
import SelectInput from "../input/SelectInput";

export default function ProductForm({ category, data, actionType }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editorValue, setEditorValue] = useState(data?.description);
  const [mainImage, setMainImage] = useState(data?.mainImage);
  const [imageGallery, setImageGallery] = useState(data?.imageGallery || []);
  const [uplodedImageGallery, setUplodedImageGallery] = useState([]);
  const router = useRouter();
  const handleImageGalleryChange = async (files) => {
    if (files.length > 6) {
      toast.error("You can upload a maximum of 6 images.");
      return;
    }

    const images = [];
    for (const file of files) {
      // Create object URL for preview
      const objectUrl = URL.createObjectURL(file);
      images.push(objectUrl);
    }
    setUplodedImageGallery(images);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    // Process main image
    // const fileInput = form.querySelector('input[name="mainImage"]');
    // const mainImage = fileInput.files[0];
    // if (mainImage) {
    //   const base64Image = await toBase64(mainImage);
    //   formData.append("mainImage", base64Image);
    // }

    // // Process image gallery
    // formData.append("imageGallery", JSON.stringify(imageGallery));

    // Append description
    const fileInput = form.querySelector('input[name="mainImage"]');
    const mainImage = fileInput.files[0];

    if (actionType === "edit") {
      if (!mainImage) formData.delete("mainImage");
      if (uplodedImageGallery.length == 0) formData.delete("imageGallery");
    }
    formData.append("description", editorValue);

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response =
          actionType === "edit"
            ? await updateProductAction({
                productId: data?.id,
                formData,
                slug: data?.slug,
              })
            : await createProductAction(formData);

        if (response.success) {
          setSuccess("Product saved successfully");

          toast.success("Product saved successfully!");
          router.push("/admin/product");
          form.reset();
        } else {
          console.log(response.message);
          setError(response.message || "Something went wrong");
        }
      } catch (error) {
        setError(error.message || "Something went wrong");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && (
        <div className="w-full rounded-md bg-red-200 p-2 text-base text-red-600">
          {error}
        </div>
      )}
      <div className="md:grid md:grid-cols-6 gap-2">
        <CheckBox
          value={actionType === "edit" ? data?.isActive : true}
          label={"Is Active"}
          name={"isActive"}
          colSpan="1"
        />
        <CheckBox
          value={data?.isFeatured}
          label={"Is Featured Product"}
          name={"isFeatured"}
          colSpan="1"
        />
        <FloatingInput
          defaultValue={data?.title}
          label={"Product Name"}
          name={"title"}
          type={"text"}
          colSpan="full"
        />
        <FloatingInput
          defaultValue={data?.slug}
          label={"Product Slug In English"}
          name={"slug"}
          type={"text"}
          colSpan="full"
        />
        <div className="md:col-span-2">
          <SelectInput
            value={data?.categoryId}
            label={"Category"}
            name={"category"}
            type={"text"}
            data={category}
          />
        </div>
        <FloatingInput
          label={"Regular Price"}
          name={"regularPrice"}
          type={"number"}
          defaultValue={data?.regularPrice}
          colSpan="2"
        />
        <FloatingInput
          label={"Discount Price"}
          name={"discountPrice"}
          type={"number"}
          defaultValue={data?.discountPrice}
          colSpan="2"
        />
        <FloatingInput
          label={"Inside Dhaka Delivery Charge"}
          name={"insideDhaka"}
          type={"text"}
          defaultValue={data?.insideDhaka}
          colSpan="2"
        />
        <FloatingInput
          label={"Outside Dhaka Delivery Charge"}
          name={"outSideDhaka"}
          type={"text"}
          defaultValue={data?.outSideDhaka}
          colSpan="2"
        />
        <FloatingInput
          label={"Product Weight"}
          name={"weight"}
          type={"text"}
          defaultValue={data?.weight}
          colSpan="2"
        />
        <FloatingInput
          label={"Main Image"}
          name={"mainImage"}
          type={"file"}
          colSpan={"full"}
        />
        {mainImage && (
          <Imagecustom
            className="col-span-full"
            w={300}
            h={300}
            src={mainImage}
            alt="Main Image"
          />
        )}
        <FloatingInput
          label={"Image Gallery"}
          name={"imageGallery"}
          type={"file"}
          colSpan={"full"}
          multiple
          onChange={(e) => handleImageGalleryChange(e.target.files)}
        />

        {uplodedImageGallery.length > 0 && (
          <div className="col-span-full flex flex-auto gap-2">
            {uplodedImageGallery.map((image, index) => (
              <Image
                key={index}
                width={100}
                height={100}
                src={image}
                alt={`Gallery Image ${index + 1}`}
              />
            ))}
          </div>
        )}
        {imageGallery.length > 0 && (
          <div className="col-span-full flex flex-auto gap-2">
            {imageGallery.map((image, index) => (
              <Imagecustom
                key={index}
                w={100}
                h={100}
                src={image}
                alt={`Gallery Image ${index + 1}`}
              />
            ))}
          </div>
        )}
        <FloatingInput
          label={"SEO Keyword"}
          name={"seoKeyWord"}
          type={"text"}
          defaultValue={data?.seoKeyWord}
          colSpan={"full"}
        />
        <FloatingInput
          label={"SEO Product Description (max 160 letters)"}
          name={"seoDescription"}
          type={"text"}
          defaultValue={data?.seoDescription}
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
        <Button
          type={"submit"}
          disabled={isPending}
          className="w-full mt-2 py-2 col-span-full"
        >
          {isPending ? "Adding..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
