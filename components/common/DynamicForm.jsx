"use client";

import { useModalContext } from "@/context/ModalContext";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "react-toastify";
import Imagecustom from "../images/ImageCustom";
import VariationInput from "../input/VariationInput";

// Dynamically imported components
const Button = dynamic(() => import("@/components/button"));
const FloatingInput = dynamic(() => import("@/components/input/FloatingInput"));
const CheckBox = dynamic(() => import("../input/CheckBox"), { ssr: false });
const CustomEditor = dynamic(
  () => import("../input/quillEditor/CustomEditor"),
  {
    ssr: false,
  }
);
const ProductVariationInput = dynamic(() =>
  import("@/components/input/ProductVariation")
);
const FileInput = dynamic(() => import("../input/FileInput"), { ssr: false });
const SearchableDropdown = dynamic(
  () => import("@/components/input/SearchableDropdown"),
  { ssr: false }
);
const TagInput = dynamic(() => import("../input/TagInput"));

export default function DynamicForm({
  category,
  data,
  actionType,
  createAction,
  updateAction,
  fromFields,
  children,
}) {
  const { closeModal } = useModalContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  console.log("DynamicForm data:", data);
  const router = useRouter();

  // useEffect(() => {
  //   if (success) {
  //     closeModal();
  //   }
  // }, [success, closeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    let newData = Object.fromEntries(formData.entries());

    setError(null);
    setSuccess(null);
    console.log("Form Data:", newData);
    startTransition(async () => {
      try {
        const response =
          actionType === "edit"
            ? await updateAction({
                id: data?.id,
                formData,
                slug: data?.slug,
              })
            : await createAction(formData);

        if (response.success) {
          toast.success("Data saved successfully!");
          form.reset();
          closeModal(); // Close the modal on success

          form.reset();
        } else {
          const errorMessage = response.message || "An unknown error occurred.";
          window.scrollTo(0, 0);
          toast.error(errorMessage);
          setError(errorMessage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        console.error("Form submission failed:", err);
        window.scrollTo(0, 0);
        toast.error(errorMessage);
        setError(errorMessage);
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
        {fromFields?.map((field, index) => {
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
            case "tag":
              return (
                <TagInput
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  defaultValue={data?.[field.name]}
                  colSpan={field.colSpan}
                />
              );
            case "select":
              return (
                <div className="md:col-span-2" key={field.name}>
                  <SearchableDropdown
                    loadLists={field.loadLists}
                    dropDownLists={field.dropDownLists}
                    name={field.name}
                    label={field.label}
                    defaultId={data?.[field.name]}
                    addForm={field.addForm}
                    colSpan={field.colSpan}
                    onSelect={field.onSelect}
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
                    defaultValue={data?.[field.name]}
                    colSpan={field?.colSpan}
                  />
                </div>
              );

            case "file":
              return (
                <FileInput
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  defaultValue={data?.[field.name]}
                  multipleSelect={field.multiple}
                />
              );
            case "image":
              return (
                <div className="col-span-full" key={field.name}>
                  <p>{field.name}</p>
                  <Imagecustom
                    key={field.name}
                    src={data?.[field.name]}
                    h={50}
                    w={50}
                    alt={field.label}
                    colSpan={field?.colSpan}
                    name={field.name}
                  />
                </div>
              );
            case "variation":
              return (
                <VariationInput
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  defaultValue={data?.[field.name]}
                  colSpan={field?.colSpan}
                  labelNote={field.labelNote}
                />
              );
            case "productVariation":
              return (
                <ProductVariationInput
                  key={field?.name}
                  label={field?.label}
                  name={field?.name}
                  defaultValue={data?.[field.name]}
                  colSpan={field?.colSpan}
                  labelNote={field?.labelNote}
                  variationList={field?.variationList}
                  initialCombinations={data?.[field.name]}
                />
              );
            default:
              return null;
          }
        })}
        <div className="col-span-full">{children}</div>
        <Button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 py-2 col-span-full"
        >
          {actionType === "edit"
            ? isPending
              ? "Updating"
              : "Update"
            : isPending
            ? "Saving..."
            : "Save"}
        </Button>
      </div>
    </form>
  );
}
