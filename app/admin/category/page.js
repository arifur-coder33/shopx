export const dynamic = "force-static";

// Example of using dynamic form in the page
import {
  deleteCategoryAction,
  getCategory,
  updateCategoryAction,
} from "@/backend/serverActions/catagoryActions";
import DynamicTable from "@/components/common/DynamicTable";
import LazyModalButton from "@/components/modal/LazyModalButton";
import { categoryFormFields } from "./components/categoryFormFields";

export default async function ProductListPage() {
  const getTableData = await getCategory();

  const tableData = await getTableData?.data;

  const fromFields = categoryFormFields({ dropdownList: tableData });

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

      <DynamicTable
        data={tableData}
        tableProperties={tableProperties}
        fromFields={fromFields}
        updateAction={updateCategoryAction}
        deleteAction={deleteCategoryAction}
      />
    </div>
  );
}
