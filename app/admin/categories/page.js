// app/admin/order/page.js
// export const revalidate = 60;
// export const dynamic = "force-static";
import { auth } from "@/auth";
import {
  deleteCategoryAction,
  getAllCategoriesList,
  getcategoryCount,
  updateCategoryAction,
} from "@/backend/serverActions/catagoryActions";
import DynamicTable from "@/components/common/DynamicTables/Index";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

export default async function CategoriesPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "category", "view")) {
    return <div>Unauthorized</div>;
  }
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
        resource={"category"}
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
          isEditabel: true,
          viewPageURL: "",
        }}
      />
    </div>
  );
}
