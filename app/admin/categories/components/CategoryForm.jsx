"use client";
import {
  createCategoryAction as createAction,
  getCategory,
} from "@/backend/serverActions/catagoryActions";
import dynamic from "next/dynamic";
import { useState } from "react";
import { categoryFormFields } from "./categoryFormFields";

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function CategoryForm({ actionType, data, updateAction }) {
  const [dropdownList, setDropDownList] = useState([]);

  const loadDropDownLists = async () => {
    const getData = await getCategory();
    setDropDownList(getData?.data || []);
    // return getData?.data || [];
  };

  const fromFields = categoryFormFields({ dropdownList, loadDropDownLists });

  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={actionType}
      createAction={createAction}
      updateAction={updateAction}
      data={data}
    ></DynamicForm>
  );
}
