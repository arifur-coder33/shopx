"use client";

import { getCategory } from "@/backend/serverActions/catagoryActions";
import { createProductAction as createAction } from "@/backend/serverActions/productActions";
import dynamic from "next/dynamic";
import { useState } from "react";
import { productFormFields } from "./productFormFields";
const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function ProductForm() {
  const [categoryDropdownList, setCategoryDropdownList] = useState([]);

  const loadCategoryDropDownLists = async () => {
    const getData = await getCategory();
    setCategoryDropdownList(getData?.data || []);
    // return getData?.data || [];
  };

  const fromFields = productFormFields({
    categoryDropdownList,
    loadCategoryDropDownLists,
  });

  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={"add"}
      createAction={createAction}
    ></DynamicForm>
  );
}
