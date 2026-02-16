"use client";
import {
  createResourceAction as createAction,
  updateResourceAction,
} from "@/backend/serverActions/resourceAction";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import components

const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function VariationForm({ actionType, updateAction, id }) {
  const [loadingData, setLoadingData] = useState(true);
  const [data, setData] = useState({});

  useEffect(() => {
    const loadInitialData = async () => {
      if (actionType === "edit" && id) {
        setLoadingData(true); // Start loading
        try {
          const { getResourceById } =
            await import("@/backend/serverActions/resourceAction");
          const getdata = await getResourceById(id);

          if (getdata.success) {
            setData(getdata.data || {});
          } else {
            toast.error("Failed to load  data");
          }
        } catch (error) {
          toast.error("Failed to load  data due to an error");
        } finally {
          setLoadingData(false); // End loading
        }
      } else {
        setLoadingData(false); // Not in edit mode or no ID, so no loading needed
      }
    };

    loadInitialData();
  }, [id, actionType]);

  const fromFields = [
    { type: "text", label: "Resource Name", name: "key", colSpan: "full" },
  ];
  if (loadingData && actionType === "edit") {
    return <LoadingSpinner />; // Display loading message for edit mode
  }
  return (
    <DynamicForm
      data={data}
      fromFields={fromFields}
      createAction={createAction}
      actionType={actionType}
      updateAction={updateResourceAction}
    ></DynamicForm>
  );
}
