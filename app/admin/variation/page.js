export const dynamic = "force-static";

// Example of using dynamic form in the page
import {
  deleteVariationAction,
  getVariations,
  updateVariationAction,
} from "@/backend/serverActions/variantionAction";
import DynamicTable from "@/components/common/DynamicTable";
import LazyModalButton from "@/components/modal/LazyModalButton";

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
      <LazyModalButton componentKey={"VariationForm"} />
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
