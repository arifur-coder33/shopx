export const dynamic = "force-static";

// Example of using dynamic form in the page
import {
  createCategoryAction as createAction,
  deleteCategoryAction,
  getCategory,
  updateCategoryAction,
} from "@/backend/serverActions/catagoryActions";
import AddItem from "@/components/common/AddItem";
import DynamicForm from "@/components/common/DynamicForm";
import DynamicTable from "@/components/common/DynamicTable";
import VariationInput from "@/components/input/VariationInput";

import ModalButton from "@/components/modal/ModalButton";

export default async function ProductListPage() {
  const getTableData = await getCategory();

  const tableData = await getTableData?.data;
  console.log(tableData);
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
      <ModalButton buttonName={<AddItem />}>
        <DynamicForm
          fromFields={fromFields}
          actionType={"add"}
          createAction={createAction}
          perifix="modal"
        >
          <VariationInput />
        </DynamicForm>
      </ModalButton>
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
