"use client";
import { createSupplier as createAction } from "@/backend/serverActions/supplierAction";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { supplierFormFields } from "./supplierFormFields";

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function SupplierForm({ actionType, updateAction, id }) {
  const [dropdownList, setDropDownList] = useState([]);
  const [loadingtData, setLoadingData] = useState(true);
  const [data, setData] = useState({});

  // const loadDropDownLists = async () => {
  //   const getData = await getCategory();
  //   setDropDownList(getData?.data || []);
  //   // return getData?.data || [];
  // };

  useEffect(() => {
    const loadInitialData = async () => {
      if (actionType === "edit" && id) {
        setLoadingData(true); // Start loading
        try {
          const { getSupplierById } =
            await import("@/backend/serverActions/supplierAction");
          const data = await getSupplierById(id);

          if (data.success) {
            setData(data.data || {});
          } else {
            toast.error("Failed to load  data");
          }
          console.log("categoryForm: Loaded product data for ID:", id, data);
        } catch (error) {
          console.error("categoryForm: Failed to load product data", error);
          toast.error("Failed to load product data due to an error");
        } finally {
          setLoadingData(false); // End loading
        }
      } else {
        setLoadingData(false); // Not in edit mode or no ID, so no loading needed
      }
    };

    loadInitialData();
  }, [id, actionType]);

  const fromFields = supplierFormFields();
  if (loadingtData && actionType === "edit") {
    return <LoadingSpinner />; // Display loading message for edit mode
  }
  return (
    <DynamicForm
      name="Supplier Form"
      fromFields={fromFields}
      actionType={actionType}
      createAction={createAction}
      updateAction={updateAction}
      data={data}
    ></DynamicForm>
  );
}
