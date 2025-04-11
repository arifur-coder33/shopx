export const dynamic = "force-static";

// Example of using dynamic form in the page
import {
  createVariationAction as createAction,
  deleteVariationAction,
  getVariations,
  updateVariationAction,
} from "@/backend/serverActions/variantionAction";
import AddItem from "@/components/common/AddItem";
import DynamicForm from "@/components/common/DynamicForm";
import DynamicTable from "@/components/common/DynamicTable";

import ModalButton from "@/components/modal/ModalButton";

export default async function VariationtPage() {
  const getTableData = await getVariations();

  const tableData = await getTableData?.data;
  console.log(tableData);
  const fromFields = [
    { type: "text", label: "Variation Name", name: "name", colSpan: "full" },
  ];

  const tableProperties = [
    { label: "Variation Name", field: "name", type: "text" },
  ];
  return (
    <div className="p-4">
      <ModalButton buttonName={<AddItem />}>
        <DynamicForm
          fromFields={fromFields}
          actionType={"add"}
          createAction={createAction}
          perifix="modal"
        />
      </ModalButton>
      <div>Add Product Variation</div>

      <DynamicTable
        data={tableData}
        tableProperties={tableProperties}
        fromFields={fromFields}
        updateAction={updateVariationAction}
        deleteAction={deleteVariationAction}
      />
    </div>
  );
}
