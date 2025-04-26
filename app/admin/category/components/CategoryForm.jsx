"use client";
import {
  createCategoryAction as createAction,
  getCategory,
} from "@/backend/serverActions/catagoryActions";
import dynamic from "next/dynamic";
import { useState } from "react";
import { categoryFormFields } from "./categoryFormFields";

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
  const [dropdownList, setDropDownList] = useState([]);

  const loadDropDownLists = async () => {
    const getData = await getCategory();
    setDropDownList(getData?.data || []);
    // return getData?.data || [];
  };

  const fromFields = categoryFormFields({dropdownList,loadDropDownLists})

  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={"add"}
      createAction={createAction}
      perifix="modal"
    >
      {/* <VariationInput /> */}
    </DynamicForm>
  );
}
