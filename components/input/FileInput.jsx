"use client";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import Imagecustom from "../images/ImageCustom";
import ModalButton from "../modal/ModalButton";
import MediaSelector from "./MediaSelector";

export default function FileInput({
  name,
  label,
  defaultValue,
  multipleSelect,
  colSpan,
}) {
  const [images, setImages] = useState(
    multipleSelect ? defaultValue || [] : defaultValue ? [defaultValue] : []
  );
  const [inputValue, setInputValue] = useState("");

  const onSelect = (selectedImages) => {
    setImages(selectedImages);
    setInputValue(selectedImages.map((img) => img.id).join(","));
  };
  useEffect(() => {
    setInputValue(
      images?.length > 0 ? images.map((img) => img.id).join(",") : []
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const removeImage = (id) => {
    const filteredImages = images.filter((image) => image.id !== id);
    setImages(filteredImages);
    setInputValue(filteredImages.map((img) => img.id).join(","));
  };
  console.log(inputValue);
  return (
    <div className="col-span-full w-full">
      <div className="grid grid-cols-6  md:grid-cols-12 items-center  gap-4">
        <div className="flex flex-col items-center flex-shrink-0 col-span-2 ">
          <label className="text-sm text-gray-600">{label}</label>
          <input hidden name={name} value={inputValue} type="text" readOnly />
          <ModalButton
            buttonName={
              <label className="cursor-pointer text-center flex flex-col items-center rounded-md border-2">
                <ImagePlus className="w-16 h-16 text-gray-500" />
              </label>
            }
          >
            <MediaSelector
              multipleSelect={multipleSelect}
              onSelect={onSelect}
            />
          </ModalButton>
        </div>

        {images?.length > 0 &&
          images?.map((image) => (
            <div key={image?.id} className="relative col-span-1 ">
              <Imagecustom
                className="rounded-md"
                placeholder="blur"
                src={image?.name}
                w={200}
                h={200}
                alt={image?.name}
              />
              <button
                onClick={() => removeImage(image?.id)}
                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 hover:bg-red-700"
              >
                <X size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
