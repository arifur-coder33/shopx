"use client";

import { getCategory } from "@/backend/serverActions/catagoryActions";
import { createProductAction as createAction } from "@/backend/serverActions/productActions";
import { getVariationByCategoryId } from "@/backend/serverActions/variantionAction";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { productFormFields } from "./productFormFields";
const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <p>Loading form...</p>,
});

export default function ProductForm({ actionType, data, updateAction }) {
  const [categoryDropdownList, setCategoryDropdownList] = useState([]);
  const [productVariationList, setProductVariationList] = useState([]);
  const loadCategoryDropDownLists = async () => {
    try {
      const getData = await getCategory();
      setCategoryDropdownList(getData?.data || []);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  };
  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };
  const onSelectCategoryHandler = useCallback(
    debounce(async (category) => {
      console.log(
        "ProductForm: Selected category in onSelectCategoryHandler:",
        category
      ); // Vercel Log
      try {
        const categoryIdToFetch = category?.id || category; // Handle if category is object or just ID
        if (!categoryIdToFetch) {
          console.log("ProductForm: No category ID to fetch variations for.");
          setProductVariationList([]); // Clear if no category
          return;
        }
        const getVariations = await getVariationByCategoryId(categoryIdToFetch);
        console.log(
          "ProductForm: Fetched variations by category:",
          getVariations
        ); // Vercel Log
        setProductVariationList(getVariations?.data || []);
      } catch (error) {
        console.error("ProductForm: Failed to load variations", error); // Vercel Log
        setProductVariationList([]); // Set to empty on error
      }
    }, 300),
    [] // Empty dependency array for useCallback, debounce handles stability
  );

  useEffect(() => {
    // For initial load if data.category is present (e.g., on edit)
    if (data?.category) {
      // data.category could be an object {id, name} or just an ID string
      const categoryId = data.category.id || data.category;
      console.log(
        "ProductForm: Initial data.category found, fetching variations for ID:",
        categoryId
      ); // Vercel Log
      if (categoryId) {
        onSelectCategoryHandler({ id: categoryId }); // Call with an object to match what select might pass
      }
    }
  }, [data?.category, onSelectCategoryHandler]); // Add onSelectCategoryHandler

  const fromFields = useMemo(() => {
    return productFormFields({
      categoryDropdownList,
      loadCategoryDropDownLists,
      onSelectCategoryHandler,
      productVariationList,
    });
  }, [categoryDropdownList, productVariationList, onSelectCategoryHandler]);

  const handleCreateAction = createAction;
  const handleUpdateAction = updateAction;
  return (
    <DynamicForm
      fromFields={fromFields}
      actionType={actionType}
      createAction={handleCreateAction}
      data={data}
      updateAction={handleUpdateAction}
    ></DynamicForm>
  );
}
