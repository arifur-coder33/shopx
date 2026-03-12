// app/admin/order/page.js
import {
  deleteVariationAction,
  getAllVariationList,
  getVariationsCount,
  updateVariationAction,
} from "@/backend/serverActions/variantionAction";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

import { auth } from "@/auth";
import DynamicTable from "@/components/common/DynamicTables/Index";

export default async function VariationsPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "variation", "view")) {
    return <div>Unauthorized</div>;
  }
  const tableProperties = [
    { label: "Name", field: "name", type: "text", sort: true },
  ];

  const initialLimit = 10;
  const defaultSort = { field: "name", order: "asc" };

  const { success, data, nextCursor, error } = await getAllVariationList({
    limit: initialLimit,
    tableProperties,
  });

  if (!success) return `Something went wrong: ${error}`;

  return (
    <div className="p-4">
      <DynamicTable
        // Data and Actions
        resource={"variation"}
        tableName={"Variation List"}
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={getAllVariationList}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[{ label: "  Name", field: "name" }]}
        filterTagProperties={[]}
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
        actionType={"edit"}
        componentKey={"CategoryForm"}
        getDataCount={getVariationsCount}
        actions={{
          getItemDataAction: "",
          itemAddFormKey: "VariationForm",
          itemUpdateFormKey: "VariationForm",
          quickViewComponentKey: "",
          updateAction: updateVariationAction,
          deleteAction: deleteVariationAction,
          actionType: "edit",
          viewPageURL: "",
        }}
      />
    </div>
  );
}
