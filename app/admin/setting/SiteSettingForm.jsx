"use client";

import { updateProductAction } from "@/backend/serverActions/productActions";
import Button from "@/components/button";
import Imagecustom from "@/components/images/ImageCustom";
import FloatingInput from "@/components/input/FloatingInput";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function SiteSettingForm({ category, data, actionType }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editorValue, setEditorValue] = useState(data?.description);
  const [mainImage, setMainImage] = useState(data?.mainImage);
  const [uploadedMainimage, setUploadedMainImage] = useState();

  const router = useRouter();

  const handlemainImagechange = async (file) => {
    setUploadedMainImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[name="mainImage"]');
    const mainImage = fileInput.files[0];

    if (!mainImage) formData.delete("mainImage");

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await updateProductAction({
          productId: data?.id,
          formData,
          slug: data?.slug,
        });

        if (response.success) {
          setSuccess("saved successfully");

          toast.success("Product saved successfully!");
        } else {
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
        <FloatingInput
          defaultValue={data?.name}
          label={"Site Name"}
          name={"name"}
          type={"text"}
          colSpan="full"
        />
        <FloatingInput
          defaultValue={data?.slogan}
          label={"Site Slogan"}
          name={"slogan"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          label={"Site Logo"}
          name={"logo"}
          type={"file"}
          colSpan={"full"}
          onChange={(e) => handlemainImagechange(e.target.files[0])}
        />

        <div className="flex gap-6 col-span-full">
          {uploadedMainimage && (
            <div className=" relative">
              <Image
                className="rounded-xl"
                width={100}
                height={100}
                src={uploadedMainimage}
                alt={`Gallery Image `}
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
        <FloatingInput
          defaultValue={data?.phoneNumber1}
          label={"Phone Number 1"}
          name={"phoneNumber1"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.phoneNumber2}
          label={"Phone Number 2"}
          name={"phoneNumber2"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.phoneNumber2}
          label={"Address1"}
          name={"adress1"}
          type={"text"}
          colSpan="full"
        />
        <FloatingInput
          defaultValue={data?.phoneNumber2}
          label={"Adress2"}
          name={"adress2"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.email}
          label={"Email"}
          name={"email"}
          type={"email"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.fbLink}
          label={"Facebook Page"}
          name={"fbLink"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.youTubeLink}
          label={"YouTube Channel"}
          name={"youTubeLink"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          defaultValue={data?.googleMap}
          label={"Google Map Link"}
          name={"googleMap"}
          type={"text"}
          colSpan="full"
        />

        <Button
          type={"submit"}
          disabled={isPending}
          className="w-full mt-2 py-2 col-span-full"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
