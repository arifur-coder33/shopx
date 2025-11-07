"use client";
import {
  createCategoryAction as createAction,
  getCategory,
} from "@/backend/serverActions/catagoryActions";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { categoryFormFields } from "./categoryFormFields";

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function CategoryForm({ actionType, updateAction, id }) {
  const [dropdownList, setDropDownList] = useState([]);
  const [loadingtData, setLoadingData] = useState(true);
  const [data, setData] = useState({});
  console.log("id in category form", id);
  const loadDropDownLists = async () => {
    const getData = await getCategory();
    setDropDownList(getData?.data || []);
    // return getData?.data || [];
  };

  useEffect(() => {
    const loadInitialData = async () => {
      if (actionType === "edit" && id) {
        setLoadingData(true); // Start loading
        try {
          const { getCategoryById } = await import(
            "@/backend/serverActions/catagoryActions"
          );
          const data = await getCategoryById(id);

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
  const fromFields = categoryFormFields({ dropdownList, loadDropDownLists });
  if (loadingtData && actionType === "edit") {
    return <LoadingSpinner />; // Display loading message for edit mode
  }
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
