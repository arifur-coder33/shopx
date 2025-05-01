"use client";

import {
  deleteProductById,
  getProductsOnScroll,
  updateProductAction,
} from "@/backend/serverActions/productActions";
import DynamicTable from "@/components/common/DynamicTable";
import LazyModalButton from "@/components/modal/LazyModalButton";
import { useEffect, useRef } from "react"; // Import useEffect
import useSWRInfinite from "swr/infinite";

// No interface definitions needed in JS

export default function ProductList({ initialProductData, categoryData }) {
  const PAGE_SIZE = 7; // Number of items to load per page
  const observerRef = useRef(null); // useRef for IntersectionObserver instance
  const loadMoreRef = useRef(null); // useRef for the trigger element

  // Custom fetcher for SWRInfinite using getProductsOnScroll
  // The fetcher should return the data array for the page
  const fetcher = async (key) => {
    const params = new URLSearchParams(key.split("?")[1]);
    const pageIndex = parseInt(params.get("page") || "1", 10);
    const limit = parseInt(params.get("limit") || `${PAGE_SIZE}`, 10);

    try {
      // Assume getProductsOnScroll returns an object like:
      // { success: boolean, data: ProductData[], meta: object, error?: string }
      const response = await getProductsOnScroll({
        page: pageIndex,
        limit: limit,
      });

      if (!response.success || !response.data) {
        console.error("Fetch failed or no data:", response.error);
        return []; // Return empty array on failure or no data
      }

      // IMPORTANT: Only return the data array
      return response.data;
    } catch (error) {
      console.error(`Error fetching page ${pageIndex}:`, error);
      return []; // Return empty array on error
    }
  };

  // SWR Infinite for paginated data
  // No type annotation needed for useSWRInfinite
  const { data, size, setSize, error, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      // Reached the end if the previous page was empty
      if (previousPageData && previousPageData.length === 0) {
        console.log("Reached end (previous page empty), returning null key");
        return null; // Reached the end
      }
      // Reached the end if the previous page fetched less data than requested
      if (previousPageData && previousPageData.length < PAGE_SIZE) {
        console.log(
          "Reached end (previous page smaller than limit), returning null key"
        );
        return null; // Reached the end
      }

      // Generate key for the next page
      const page = pageIndex + 1;
      const key = `/products?page=${page}&limit=${PAGE_SIZE}`;
      console.log("Generating SWR key:", key);
      return key;
    },
    fetcher,
    {
      fallbackData: initialProductData ? [initialProductData] : [], // Use initial data for the first page, ensure it's an array
      revalidateFirstPage: false, // Prevent revalidation of the first page
      // revalidateOnFocus: false, // Optional: prevent revalidation on window focus
    }
  );

  // Combine all pages of data
  const products = data ? data.flat() : [];
  // Determine if we are potentially reaching the end
  const isReachingEnd = data && data[data.length - 1]?.length < PAGE_SIZE;
  // Determine if *all* data might be loaded (used to hide loading indicators/triggers)
  const isEmpty = data?.[0]?.length === 0; // Check if the *first* page was empty
  const hitEndOfData =
    isEmpty || (data && data[data.length - 1]?.length === 0) || isReachingEnd; // More robust end check

  // Effect to setup Intersection Observer
  useEffect(() => {
    const currentLoadMoreRef = loadMoreRef.current;
    if (!currentLoadMoreRef) {
      console.log("Load more ref not available yet.");
      return;
    }

    if (observerRef.current) {
      observerRef.current.disconnect();
      console.log("Disconnected previous observer.");
    }

    // Don't observe if we've likely hit the end or are currently loading
    if (hitEndOfData || isValidating) {
      console.log("Not observing: Hit end or validating.");
      // Ensure observer is disconnected if we hit the end while it was active
      if (observerRef.current) observerRef.current.disconnect();
      return;
    }

    console.log("Setting up Intersection Observer.");
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating) {
          console.log("Intersection detected! Loading next page...");
          setSize((prevSize) => {
            const nextSize = prevSize + 1;
            console.log("Increasing size from:", prevSize, "to:", nextSize);
            return nextSize;
          });
        } else {
          // console.log("Intersection Observer triggered but not loading (intersecting:", entries[0].isIntersecting, "isValidating:", isValidating, ")");
        }
      },
      { threshold: 0.1 } // Trigger when 10% visible
    );

    observerRef.current.observe(currentLoadMoreRef);
    console.log("Observing target element.");

    return () => {
      console.log("Cleaning up observer.");
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
    // Re-run effect when loading state changes, or end-of-data condition changes.
    // Adding `size` ensures re-evaluation if size changes externally, though usually it changes *because* of this effect.
  }, [isValidating, setSize, hitEndOfData, size]); // Removed `data` as `hitEndOfData` depends on it

  const tableProperties = [
    {
      label: "Is Active",
      field: "isActive",
      type: "checkbox",
      // action: () => {}, // Define action if needed
    },
    { label: "Image", field: "thumbnail", type: "image", alt: "title" }, // Make sure 'thumbnail' has 'name' property if type is 'image' expects it
    { label: "Product Name", field: "title", type: "text" },
    {
      label: "Category",
      field: "category",
      type: "object",
      objectPropertyName: "name", // Ensure 'category' object has a 'name' property
    },
    { label: "Price", field: "discountPrice", type: "text" }, // Consider adding currency formatting
    { label: "Created At", field: "createdAt", type: "date" },
  ];

  if (error) return <div>Failed to load products. Error: {error.message}</div>;
  const deleteAction = deleteProductById;
  const updateAction = updateProductAction;
  return (
    <div>
      <LazyModalButton componentKey={"ProductForm"} actionType={"add"} />
      <DynamicTable
        data={products} // Pass the combined data
        tableProperties={tableProperties}
        updateAction={updateAction} // Define update action
        deleteAction={deleteAction} // Define delete action
        actionType={"edit"}
        componentKey={"ProductForm"}
      />

      {/* Load More Trigger & Loading Indicator */}
      {/* Ensure the ref div is always rendered so the ref is attached */}
      <div
        ref={loadMoreRef}
        style={{
          height: "50px",
          margin: "20px 0",
          border: "1px solid transparent",
        }}
      >
        {" "}
        {/* Added transparent border for visual debugging if needed */}
        {isValidating && <p>Loading more products...</p>}
        {/* Show "No more products" only if not loading, we've hit the end, AND there are products */}
        {!isValidating && hitEndOfData && products.length > 0 && (
          <p>No more products.</p>
        )}
        {/* Show "No products found" only if not loading, we've hit the end (or first page was empty), AND there are no products */}
        {!isValidating && hitEndOfData && products.length === 0 && (
          <p>No products found.</p>
        )}
      </div>
    </div>
  );
}
