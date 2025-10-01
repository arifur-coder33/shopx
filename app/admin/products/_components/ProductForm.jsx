"use client";

import { getCategory } from "@/backend/serverActions/catagoryActions";
import { createProductAction as createAction } from "@/backend/serverActions/productActions";
import { getVariationByCategoryId } from "@/backend/serverActions/variantionAction";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { productFormFields } from "./productFormFields";
const DynamicForm = dynamic(() => import("@/components/common/DynamicForm"), {
  ssr: false,
  loading: () => <LoadingSpinner />,
});

export default function ProductForm({ actionType, updateAction, id }) {
  const [categoryDropdownList, setCategoryDropdownList] = useState([]);
  const [productVariationList, setProductVariationList] = useState([]);
  const [loadingProductData, setLoadingProductData] = useState(true);
  const [data, setData] = useState({});

  const loadCategoryDropDownLists = async () => {
    console.log("Loading categories for dropdown");
    try {
      const getData = await getCategory();
      console.log("Categories loaded:", getData);
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
      try {
        const categoryIdToFetch = category?.id || category; // Handle if category is object or just ID
        if (!categoryIdToFetch) {
          console.log("ProductForm: No category ID to fetch variations for.");
          setProductVariationList([]); // Clear if no category
          return;
        }
        const getVariations = await getVariationByCategoryId(categoryIdToFetch);

        setProductVariationList(getVariations?.data || []);
      } catch (error) {
        setProductVariationList([]); // Set to empty on error
      }
    }, 300),
    [] // Empty dependency array for useCallback, debounce handles stability
  );

  useEffect(() => {
    const loadInitialProductData = async () => {
      if (actionType === "edit" && id) {
        setLoadingProductData(true); // Start loading
        try {
          const { getProductById } = await import(
            "@/backend/serverActions/productActions"
          );
          const productData = await getProductById(id);

          if (productData.success) {
            setData(productData.data || {});
          } else {
            toast.error("Failed to load product data");
          }
          console.log(
            "ProductForm: Loaded product data for ID:",
            id,
            productData
          );
        } catch (error) {
          console.error("ProductForm: Failed to load product data", error);
          toast.error("Failed to load product data due to an error");
        } finally {
          setLoadingProductData(false); // End loading
        }
      } else {
        setLoadingProductData(false); // Not in edit mode or no ID, so no loading needed
      }
    };

    loadInitialProductData();
  }, [id, actionType]);

  
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

  if (loadingProductData && actionType === "edit") {
    return <LoadingSpinner />; // Display loading message for edit mode
  }
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
