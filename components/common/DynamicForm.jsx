"use client";

import { useModalContext } from "@/context/ModalContext";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import VariationInput from "../input/VariationInput";

// Dynamically imported components
const Button = dynamic(() => import("@/components/button"));
const FloatingInput = dynamic(() => import("@/components/input/FloatingInput"));
const CheckBox = dynamic(() => import("../input/CheckBox"), { ssr: false });
const CustomEditor = dynamic(() => import("../input/CustomEditor"), {
  ssr: false,
});
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

  const router = useRouter();

  useEffect(() => {
    if (success) {
      closeModal();
    }
  }, [success, closeModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    let newData = Object.fromEntries(formData.entries());
    console.log(newData);

    setError(null);
    setSuccess(null);

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
        console.log(response);
        if (response.success) {
          setSuccess("Data saved successfully");
          toast.success("Data saved successfully!");

          form.reset();
        } else {
          window.scrollTo(0, 0);
          toast.warn(response.error || "Something went wrong");
          setError(response.error || "Something went wrong");
        }
      } catch (error) {
        console.log(error);
        setError(error || "Something went wrong");
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
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  defaultValue={data?.[field.name]}
                  colSpan={field?.colSpan}
                  labelNote={field.labelNote}
                  variationList={field.variationList}
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
          {isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
