export const dynamic = "force-static";

// Example of using dynamic form in the page
import {
  deleteCategoryAction,
  getCategory,
  updateCategoryAction,
} from "@/backend/serverActions/catagoryActions";
import DynamicTable from "@/components/common/DynamicTable";

import LazyModalButton from "@/components/modal/LazyModalButton";

export default async function ProductListPage() {
  const getTableData = await getCategory();

  const tableData = await getTableData?.data;

  const fromFields = [
    { type: "file", label: "Thumbnail", name: "thumbnail", colSpan: "4" },
    { type: "text", label: "Category Name", name: "name", colSpan: "2" },
    {
      type: "text",
      label: "Category Slug in english",
      name: "slug",
      colSpan: "2",
    },
    {
      type: "select",
      label: "Parent Category",
      name: "parentCategory",
      colSpan: "3",
      data: tableData,
    },
    { type: "file", label: "Category Banner", name: "banner", colSpan: "full" },
    {
      type: "checkbox",
      label: "Has Vairant",
      name: "isVariation",
      colSpan: "1",
    },
  ];
  const tableProperties = [
    { label: "Thumbnail", field: "thumbnail", type: "image", alt: "name" },
    { label: "Name", field: "name", type: "text" },
    {
      label: "Parent Category",
      field: "parentCategory",
      type: "dropdown",
      options: tableData,
    }, // Assuming category has a 'name' property

    // { label: "Status", field: "status", type: "dropdown", options: categoryData?.data, }, // Example of dropdown

    { label: "Created At", field: "createdAt", type: "date" },
  ];
  return (
    <div className="p-4">
      <LazyModalButton componentKey={"CategoryForm"} />
      <div>Product Add</div>
      <DynamicTable
        data={tableData}
        tableProperties={tableProperties}
        fromFields={fromFields}
        updateAction={deleteCategoryAction}
        deleteAction={updateCategoryAction}
      />
    </div>
  );
}
