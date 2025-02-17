"use client";

import Button from "@/components/button";
import FloatingInput from "@/components/input/FloatingInput";
import { useModalContext } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import CheckBox from "../input/CheckBox";
import CustomEditor from "../input/CustomEditor";
import FileInput from "../input/FileInput";
import SearchableDropdown from "../input/SearchableDropdown";

export default function DynamicForm({
  category,
  data,
  actionType,
  createAction,
  updateAction,
  fields,
}) {
  const { closeModal } = useModalContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editorValue, setEditorValue] = useState(data?.description);
  const [mainImage, setMainImage] = useState(data?.mainImage);
  const [uploadedMainimage, setUploadedMainImage] = useState();
  const [imageGallery, setImageGallery] = useState(data?.imageGallery || []);
  const [uplodedImageGallery, setUplodedImageGallery] = useState([]);
  const router = useRouter();

  const uploadedImageLength = uplodedImageGallery?.length * 100;

  useEffect(() => {
    if (success) {
      closeModal();
    }
  }, [success, closeModal]);

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

  const handleMainImageChange = async (file) => {
    setUploadedMainImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const fileInput = form.querySelector('input[name="mainImage"]');
    const mainImage = fileInput.files[0];

    if (actionType === "edit") {
      if (!mainImage) formData.delete("mainImage");
      if (uplodedImageGallery.length === 0) formData.delete("imageGallery");
    }

    formData.append("description", editorValue);

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response =
          actionType === "edit"
            ? await updateAction({
                productId: data?.id,
                formData,
                slug: data?.slug,
              })
            : await createAction(formData);

        if (response.success) {
          setSuccess("Product saved successfully");
          toast.success("Product saved successfully!");
          router.push("/admin/product");
          form.reset();
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
        {fields?.map((field, index) => {
          switch (field.type) {
            case "checkbox":
              return (
                <CheckBox
                  index={index}
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={data?.[field.name] || field.defaultChecked}
                  colSpan={field.colSpan}
                  action={field.toggleAction}
                  id={data?.id}
                />
              );
            case "text":
            case "number":
              return (
                <FloatingInput
                  index={index}
                  key={field.name}
                  defaultValue={data?.[field.name]}
                  label={field.label}
                  name={field.name}
                  type={field.type}
                  colSpan={field.colSpan}
                  multiple={field.multiple}
                  onChange={
                    field.name === "mainImage" ? handleMainImageChange : null
                  }
                />
              );
            case "select":
              return (
                <div className="md:col-span-2" key={field.name}>
                  <SearchableDropdown
                    options={field.data}
                    name={field.name}
                    label={field.label}
                    defaultId={data?.[field.name].id}
                  />
                  {/* <SelectInput
                    index={index}
                    defaultValue={data?.[field.name]}
                    label={field.label}
                    name={field.name}
                    data={field.data}
                  /> */}
                </div>
              );
            case "editor":
              return (
                <div className="col-span-full" key={field.name}>
                  <CustomEditor
                    label={field.label}
                    name={field.name}
                    editorValue={editorValue}
                    setEditorValue={setEditorValue}
                  />
                </div>
              );

            case "file":
              return (
                <FileInput
                  label={field.label}
                  name={field.name}
                  multipleSelect={true}
                />
              );
            default:
              return null;
          }
        })}
        <Button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2 col-span-full"
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
