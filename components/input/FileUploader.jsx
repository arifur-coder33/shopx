"use client";

import { uploadImagesAction } from "@/backend/serverActions/fileUploadAction";
import { useModalContext } from "@/context/ModalContext";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
export default function ImageUploader({ multiple = false, onUpload }) {
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const { closeModal } = useModalContext();
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (success) {
      closeModal();
    }
  }, [success, closeModal]);
  const onDrop = useCallback(
    (acceptedFiles) => {
      const newImages = acceptedFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

      setImages(multiple ? [...images, ...newImages] : newImages);
    },
    [images, multiple]
  );

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (images.length === 0) return;
    const formData = new FormData();
    images.forEach(({ file }) => {
      formData.append("imageGallery", file);
    });

    setUploading(true);
    try {
      const result = await uploadImagesAction(formData);
      setUploading(false);
      console.log(result);

      if (result.success) {
        setImages([]);
        setSuccess(true);
        toast.success("Product saved successfully!");
        if (onUpload) {
          onUpload(new Date());
        }
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: multiple,
  });

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        {...getRootProps()}
        className="cursor-pointer p-4 flex flex-col items-center justify-center border-2 border-dashed rounded-lg hover:border-gray-500 bg-gray-100"
      >
        <input {...getInputProps()} />
        <Upload size={40} className="text-gray-500" />
        <p className="text-gray-500 text-xs">Drag & Drop or Click to Upload</p>
      </div>

      {images.length > 0 && (
        <div className="flex gap-4 flex-wrap">
          {images.map((img, index) => (
            <div key={index} className="relative w-24 h-24">
              <Image
                src={img.preview}
                alt="Uploaded preview"
                className="w-full h-full object-cover rounded-md"
                height={100}
                width={100}
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <button
          onClick={handleUpload}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Images"}
        </button>
      )}
    </div>
  );
}
