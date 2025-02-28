export const dynamic = "force-static";

// Example of using dynamic form in the page
import { getCategory } from "@/backend/serverActions/catagoryActions";
import {
  createProductAction,
  deleteProductById,
  getProducts,
  updateProductAction,
  updateProductStatus,
} from "@/backend/serverActions/productActions";
import AddItem from "@/components/common/AddItem";
import DynamicForm from "@/components/common/DynamicForm";
import DynamicTable from "@/components/common/DynamicTable";

import ModalButton from "@/components/modal/ModalButton";

export default async function ProductListPage() {
  const categoryData = await getCategory();
  const productData = await getProducts();
  console.log(productData);
  const fromFields = [
    {
      type: "checkbox",
      label: "Is Active",
      name: "isActive",
      colSpan: "1",
      defaultChecked: true,
    },
    {
      type: "checkbox",
      label: "Is Featured Product",
      name: "isFeatured",
      colSpan: "1",
    },
    { type: "file", label: "Main Image", name: "thumbnail", colSpan: "full" },
    { type: "text", label: "Product Name", name: "title", colSpan: "full" },
    { type: "text", label: "Product Slug", name: "slug", colSpan: "full" },
    {
      type: "select",
      label: "Category",
      name: "category",
      colSpan: "2",
      data: categoryData?.data,
    },
    {
      type: "number",
      label: "Regular Price",
      name: "regularPrice",
      colSpan: "2",
    },
    {
      type: "number",
      label: "Discount Price",
      name: "discountPrice",
      colSpan: "2",
    },
    {
      type: "text",
      label: "Inside Dhaka Delivery Charge",
      name: "insideDhaka",
      colSpan: "2",
    },
    {
      type: "text",
      label: "Outside Dhaka Delivery Charge",
      name: "outSideDhaka",
      colSpan: "2",
    },
    {
      type: "text",
      label: "Product Weigh",
      name: "weight",
      colSpan: "2",
    },

    {
      type: "file",
      label: "Product Gallery",
      multiple: true,
      name: "gallery",
      colSpan: "full",
    },
    {
      type: "tag",
      label: "Product Tag",
      name: "seoKeyWord",
      colSpan: "full",
    },
    {
      type: "text",
      label: "Seo Description",
      name: "seoDescription",
      colSpan: "full",
    },
    { type: "editor", label: "Description", name: "description" },
  ];
  const tableProperties = [
    {
      label: "Is Active",
      field: "isActive",
      type: "checkbox",
      action: updateProductStatus,
    },
    { label: "Image", field: "thumbnail", type: "image", alt: "title" },
    { label: "Product Name", field: "title", type: "text" },
    {
      label: "Category",
      field: "category",
      type: "dropdown",
      options: categoryData?.data,
    }, // Assuming category has a 'name' property
    { label: "Price", field: "discountPrice", type: "text" },
    // { label: "Status", field: "status", type: "dropdown", options: categoryData?.data, }, // Example of dropdown

    { label: "Created At", field: "createdAt", type: "date" },
  ];
  return (
    <div className="p-4">
      <ModalButton buttonName={<AddItem />}>
        <DynamicForm
          fromFields={fromFields}
          actionType={"add"}
          createAction={createProductAction}
          perifix="modal"
        />
      </ModalButton>
      <div>Product Add</div>

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
