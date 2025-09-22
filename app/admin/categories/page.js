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

const tableProperties = [
  { label: "Thumbnail", field: "thumbnail", type: "image", alt: "name" },
  { label: "Name", field: "name", type: "text" },
  {
    label: "Parent Category",
    field: "parentCategory",
    type: "dropdown",
    options: [],
  }, // Assuming category has a 'name' property

  // { label: "Status", field: "status", type: "dropdown", options: categoryData?.data, }, // Example of dropdown

  { label: "Created At", field: "createdAt", type: "date" },
];
export default async function ProductListPage() {
  // const getTableData = await getCategory();
  let tableData = [];
  try {
    const getTableData = await getCategory();
    tableData = getTableData?.data || [];
  } catch (error) {
    console.error("Failed to fetch category data:", error);
  }
  // const tableData = await getTableData?.data;
  tableProperties[2].options = tableData;
  const fromFields = categoryFormFields({ dropdownList: tableData });

  return (
    <div className="p-4">
      <LazyModalButton componentKey={"CategoryForm"} />

      <DynamicTable
        data={tableData}
        tableProperties={tableProperties}
        fromFields={fromFields}
        updateAction={updateCategoryAction}
        deleteAction={deleteCategoryAction}
        actionType={"edit"}
        componentKey={"CategoryForm"}
      />
    </div>
  );
}
