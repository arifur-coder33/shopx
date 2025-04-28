export const dynamic = "force-static";

// Example of using dynamic form in the page
import { getCategory } from "@/backend/serverActions/catagoryActions";
import {
  deleteProductById,
  getProducts,
  updateProductAction,
  updateProductStatus,
} from "@/backend/serverActions/productActions";
import DynamicTable from "@/components/common/DynamicTable";
import LazyModalButton from "@/components/modal/LazyModalButton";

import { productFormFields } from "./components/productFormFields";

export default async function ProductListPage() {
  const categoryData = await getCategory();
  const productData = await getProducts();
  console.log(productData);
const onChangeCategoryHandler=({productId,Category})=>{

}
  const tableProperties = [
    {
      label: "Is Active",
      field: "isActive",
      type: "checkbox",
      action: updateProductStatus,
    },
    { label: "Image", field: "thumbnail", type: "image", alt: "title" },
    { label: "Product Name", field: "title", type: "text" },
    { label: "Category", field: "category", type: "object" ,objectPropertyName:"name" },
 
    { label: "Price", field: "discountPrice", type: "text" },
    // { label: "Status", field: "status", type: "dropdown", options: categoryData?.data, }, // Example of dropdown

    { label: "Created At", field: "createdAt", type: "date" },
  ];

  const fromFields = productFormFields({
    categoryDropdownList: categoryData?.data,
  });
  return (
    <div className="p-4">
      <LazyModalButton componentKey={"ProductForm"} />
      <DynamicTable
        data={productData?.data}
        tableProperties={tableProperties}
        fromFields={fromFields}
        updateAction={updateProductAction}
        deleteAction={deleteProductById}
      />
    </div>
  );
}
