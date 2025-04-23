"use client";
import {
  createCategoryAction as createAction,
  getCategory,
} from "@/backend/serverActions/catagoryActions";
import dynamic from "next/dynamic";
import { useState } from "react";

// Dynamically import components
const VariationInput = dynamic(
  () => import("@/components/input/VariationInput"),
  {
    ssr: false,
    loading: () => <p>Loading variation input...</p>,
  }
);

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function CategoryForm() {
  const [tableData, setTableData] = useState([]);

  const loadCategoryDropDownList = async () => {
    const getTableData = await getCategory();
    return getTableData?.data || [];
  };

  const fromFields = [
    { type: "file", label: "Thumbnail", name: "thumbnail", colSpan: "4" },
    { type: "text", label: "Category Name", name: "name", colSpan: "2" },
    {
      type: "text",
      label: "Category Slug in english",
      name: "slug",
      colSpan: "2",
    },
    {
      type: "select",
      label: "Parent Category",
      name: "parentCategory",
      colSpan: "3",
      dropDownLists: loadCategoryDropDownList,
      addForm: "",
    },
    { type: "file", label: "Category Banner", name: "banner", colSpan: "full" },
    {
      type: "checkbox",
      label: "Has Vairant",
      name: "isVariation",
      colSpan: "1",
    },
  ];

  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={"add"}
      createAction={createAction}
      perifix="modal"
    >
      <VariationInput />
    </DynamicForm>
  );
}
