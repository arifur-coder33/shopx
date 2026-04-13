"use client";

import { homeBannerUpdate } from "@/backend/serverActions/bannerAction";

import Button from "@/components/button";
import Imagecustom from "@/components/images/ImageCustom";
import FloatingInput from "@/components/input/FloatingInput";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";

export default function HomePageBannerForm({ data }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mainImage, setMainImage] = useState(data?.image);
  const [uploadedMainimage, setUploadedMainImage] = useState();

  const router = useRouter();

  const handlemainImagechange = async (file) => {
    setUploadedMainImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const singleImage = formData.get("image");
    if (singleImage?.size === 0) {
      formData.delete("image");
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await homeBannerUpdate(formData);

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
          label={"Name"}
          name={"name"}
          type={"text"}
          colSpan="full"
        />

        <FloatingInput
          label={"Banner"}
          name={"image"}
          type={"file"}
          colSpan={"full"}
          onChange={(e) => handlemainImagechange(e.target.files[0])}
        />

        <div className="flex gap-6 col-span-full">
          {uploadedMainimage && (
            <div className=" relative">
              <Image
                className="rounded-xl"
                width={600}
                height={200}
                src={uploadedMainimage}
                alt={`Gallery Image `}
                unoptimized
              />
              <p className="border-2 text-center bg-slate-900 absolute bottom-0 left-0 text-[14px] opacity-70 w-[100px]">
                <span className="text-white">New image</span>
              </p>
            </div>
          )}

          {mainImage && (
            <>
              <div className="relative ">
                <Imagecustom w={600} h={200} src={mainImage} alt="Main Image" />
                <p className="border-2 text-center bg-slate-900 absolute bottom-0 left-0 text-[14px] opacity-70 w-[100px]">
                  <span className="text-white">Old image</span>
                </p>
              </div>
            </>
          )}
        </div>

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
