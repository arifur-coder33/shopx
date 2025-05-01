// export const dynamic = "force-static";
// export const revalidate = 60; // Revalidate every 60 seconds

// import { getCategory } from "@/backend/serverActions/catagoryActions";
// import {
//   deleteProductById,
//   getProducts,
//   updateProductAction,
//   updateProductStatus,
// } from "@/backend/serverActions/productActions";
// import DynamicTable from "@/components/common/DynamicTable";
// import LazyModalButton from "@/components/modal/LazyModalButton";
// import { productFormFields } from "./components/productFormFields";

// const tableProperties = [
//   {
//     label: "Is Active",
//     field: "isActive",
//     type: "checkbox",
//     action: updateProductStatus,
//   },
//   { label: "Image", field: "thumbnail", type: "image", alt: "title" },
//   { label: "Product Name", field: "title", type: "text" },
//   {
//     label: "Category",
//     field: "category",
//     type: "object",
//     objectPropertyName: "name",
//   },
//   { label: "Price", field: "discountPrice", type: "text" },
//   { label: "Created At", field: "createdAt", type: "date" },
// ];

// export default async function ProductListPage() {
//   let categoryData = [];
//   let productData = [];
//   try {
//     const [categories, products] = await Promise.all([
//       getCategory(),
//       getProducts(),
//     ]);
//     categoryData = categories?.data || [];
//     productData = products?.data || [];
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   }

//   const onSelectCategoryHandler = async (item) => {
//     console.log("Category", item);
//   };

//   const fromFields = productFormFields({
//     categoryDropdownList: categoryData,
//     onSelectCategoryHandler: onSelectCategoryHandler,
//     productVariationList: [],
//   });

//   return (
//     <div className="p-4">
//       <LazyModalButton componentKey={"ProductForm"} actionType={"add"} />
//       <DynamicTable
//         data={productData}
//         tableProperties={tableProperties}
//         fromFields={fromFields}
//         updateAction={updateProductAction}
//         deleteAction={deleteProductById}
//         actionType={"edit"}
//         componentKey={"ProductForm"}
//       />
//     </div>
//   );
// }

// import { getCategory } from "@/backend/serverActions/catagoryActions";
// import {
//   deleteProductById,
//   getProducts,
//   updateProductAction,
//   updateProductStatus,
// } from "@/backend/serverActions/productActions";
// import DynamicTable from "@/components/common/DynamicTable";
// import LazyModalButton from "@/components/modal/LazyModalButton";
// import { unstable_serialize } from "swr";
// import { productFormFields } from "./components/productFormFields";

// export const dynamic = "force-static";
// export const revalidate = 60; // Revalidate every 60 seconds

// const tableProperties = [
//   {
//     label: "Is Active",
//     field: "isActive",
//     type: "checkbox",
//     action: updateProductStatus,
//   },
//   { label: "Image", field: "thumbnail", type: "image", alt: "title" },
//   { label: "Product Name", field: "title", type: "text" },
//   {
//     label: "Category",
//     field: "category",
//     type: "object",
//     objectPropertyName: "name",
//   },
//   { label: "Price", field: "discountPrice", type: "text" },
//   { label: "Created At", field: "createdAt", type: "date" },
// ];

// export default async function ProductListPage() {
//   let categoryData = [];
//   let productData = [];
//   try {
//     // Fetch data in parallel
//     const [categories, products] = await Promise.all([
//       getCategory(),
//       getProducts(),
//     ]);
//     categoryData = categories?.data || [];
//     productData = products?.data || [];
//   } catch (error) {
//     console.error("Failed to fetch data:", error);
//   }

//   // Serialize keys for SWR prefetching
//   const serializedCategoryKey = unstable_serialize(["categories"]);
//   const serializedProductKey = unstable_serialize(["products"]);

//   const onSelectCategoryHandler = async (item) => {
//     console.log("Category", item);
//   };

//   const fromFields = productFormFields({
//     categoryDropdownList: categoryData,
//     onSelectCategoryHandler: onSelectCategoryHandler,
//     productVariationList: [],
//   });

//   return (
//     <div className="p-4">
//       {/* Prefetch keys for SWR */}
//       <script
//         type="application/json"
//         id="swr-prefetch"
//         dangerouslySetInnerHTML={{
//           __html: JSON.stringify({
//             [serializedCategoryKey]: categoryData,
//             [serializedProductKey]: productData,
//           }),
//         }}
//       />
//       <LazyModalButton componentKey={"ProductForm"} actionType={"add"} />
//       <DynamicTable
//         data={productData}
//         tableProperties={tableProperties}
//         fromFields={fromFields}
//         updateAction={updateProductAction}
//         deleteAction={deleteProductById}
//         actionType={"edit"}
//         componentKey={"ProductForm"}
//       />
//     </div>
//   );
// }
import { getCategory } from "@/backend/serverActions/catagoryActions";
import { getProductsOnScroll } from "@/backend/serverActions/productActions";
import ProductList from "./components/ProductList";

export const dynamic = "force-static";
export const revalidate = 60; // Revalidate every 60 seconds

export default async function ProductListPage() {
  let categoryData = [];
  let initialProductData = [];
  try {
    // Fetch categories and the first page of products
    const [categories, products] = await Promise.all([
      getCategory(),
      getProductsOnScroll({ page: 1, limit: 7 }), // Fetch only the first 10 items
    ]);
    categoryData = categories?.data || [];
    initialProductData = products?.data || [];
  } catch (error) {
    console.error("Failed to fetch data:", error);
  }

  return (
    <div className="p-4">
      <ProductList
        initialProductData={initialProductData}
        categoryData={categoryData}
      />
    </div>
  );
}
