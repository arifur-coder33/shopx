"use client";
import {
  createVariationAction as createAction,
  getVariations,
} from "@/backend/serverActions/variantionAction";
import dynamic from "next/dynamic";
import { useState } from "react";

// Dynamically import components

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function VariationForm() {
  const [tableData, setTableData] = useState([]);

  const loadCategoryDropDownList = async () => {
    const getTableData = await getVariations();
    return getTableData?.data || [];
  };

  console.log(tableData, "tableData");
  const fromFields = [
    { type: "text", label: "Variation Name", name: "name", colSpan: "full" },
  ];

  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={"add"}
      createAction={createAction}
      perifix="modal"
    ></DynamicForm>
  );
}
