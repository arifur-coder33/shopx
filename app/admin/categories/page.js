// app/admin/order/page.js

import {
  deleteCategoryAction,
  getAllCategoriesList,
  getcategoryCount,
  updateCategoryAction,
} from "@/backend/serverActions/catagoryActions";
import DynamicTable from "@/components/common/DynamicTables/Index";

export default async function CategoriesPage() {
  const tableProperties = [
    { label: "Thumbnail", field: "thumbnail", type: "image", alt: "name" },
    {
      label: "Name",
      field: "name",
      type: "text",
      sort: true,
    },
    {
      label: "Parent Category",
      field: "parentCategory.name",
      type: "text",
    },
    {
      label: "Product Qty",
      field: "_count.products",
      type: "number",
    },
  ];

  const initialLimit = 10;

  const { success, data, nextCursor, error } = await getAllCategoriesList({
    limit: initialLimit,
    tableProperties,
  });

  if (!success) return `Something went wrong: ${error}`;

  return (
    <div className="p-4">
      <DynamicTable
        // Data and Actions
        tableName={"Categories List"}
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={getAllCategoriesList}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[{ label: " Category Name", field: "name" }]}
        filterTagProperties={[]}
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
        actionType={"edit"}
        componentKey={"CategoryForm"}
        getDataCount={getcategoryCount}
        actions={{
          getItemDataAction: "",
          itemAddFormKey: "CategoryForm",
          itemUpdateFormKey: "CategoryForm",
          quickViewComponentKey: "",
          updateAction: updateCategoryAction,
          deleteAction: deleteCategoryAction,
          actionType: "edit",
          viewPageURL: "",
        }}
      />
    </div>
  );
}
