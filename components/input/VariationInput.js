"use client";
import { getVariations } from "@/backend/serverActions/variantionAction";
import { useState } from "react";
import SearchableDropdown from "./SearchableDropdown";
import TagInput from "./TagInput";

// const variationsList = [
//   { id: "454545", name: "Size" },
//   { id: "656565", name: "Color" },
//   { id: "767676", name: "Material" },
// ]; // Example variations with IDs

export default function VariationInput() {
  const [rows, setRows] = useState([{ variation: "", values: "" }]);
  const [variationsList, setVariationsList] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState([
    { variation: "", values: "" },
  ]);
  // useEffect(() => {
  //   async function getVariationsList() {
  //     const data = await getVariations();
  //     setVariationsList(data?.data);
  //   }
  //   getVariationsList();
  // }, []);

  const onSelect = (item, index) => {
    setSelectedVariation((prev) => {
      const updated = [...prev];

      // যদি index পূর্বে না থাকে (মানে array ছোট হয়)
      if (index >= updated.length) {
        // index পর্যন্ত ফাঁকা জায়গা পূরণ করো (undefined দিয়ে)
        while (updated.length < index) {
          updated.push(undefined);
        }
        // তারপর নতুন item বসাও
        updated.push(item);
      } else {
        // index আগে থেকেই থাকলে update করো
        updated[index] = item;
      }

      return updated;
    });
    handleVariationChange(index, item); // Update the variation name in the rows state
  };

  const handleRemove = (index) => {
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows.splice(index, 1);
      return updatedRows;
    });
    setSelectedVariation((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    setVariationsList((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
  };
  const handleVariationChange = (index, value) => {
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index].variation = value;
      return updatedRows;
    });
  };

  const handleValueChange = (index, value) => {
    console.log("value", value);
    console.log("index", index);
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index].values = value;
      return updatedRows;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { variation: "", values: "" }]);
  };

  const assignedVariations = rows.map((row) => row?.variation);
  const allVariationsAssigned =
    assignedVariations.length >= variationsList.length;
  const allValuesAssigned = rows.every((row) => row.values.trim() !== "");
  const allVariationsSelected = assignedVariations.every(
    (row) => row.name !== ""
  );

  const variationValues = rows
    .filter((row) => row.variation && row.values)
    .map((row) => ({
      variationId: variationsList.find((v) => v.name === row.variation)?.id,
      value: row.values.split(",").map((val) => val.trim()),
    }));

  const loadVariations = async () => {
    const getData = await getVariations();
    setVariationsList(getData?.data || []);
    // return getData?.data || [];
  };

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",

        margin: "auto",
      }}
      className="w-full"
    >
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
        Assign Variations
      </h2>
      {rows.map((row, index) => (
        // console.log("row", index, rows[index]?.variation),
        <div
          key={index}
          style={{ display: "flex", gap: "8px", marginBottom: "8px" }}
        >
          {/* <select
            value={row.variation}
            onChange={(e) => handleVariationChange(index, e.target.value)}
            style={{
              flex: 1,
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <option value="">Select Variation</option>
            {variationsList.map(({ id, name }) => (
              <option
                key={id}
                value={name}
                disabled={assignedVariations.includes(name)}
              >
                {name}
              </option>
            ))}
          </select> */}
          <SearchableDropdown
            index={index}
            onSelect={onSelect}
            loadLists={loadVariations}
            dropDownLists={variationsList.filter(
              (item) =>
                !selectedVariation.some((selected) => selected?.id === item.id)
            )}
            name={""}
            label={"Assign Variation"}
            // defaultId={rows[index]?.variation}
            defaultId={row.variation}
            addForm={"VariationForm"}
          />
          {/* <input
            placeholder="Enter values (comma-separated)"
            value={row.values}
            onChange={(e) => handleValueChange(index, e.target.value)}
            style={{
              flex: 2,
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          /> */}
          <TagInput
            onChange={(e) => handleValueChange(index, e)}
            defaultValue={row.values}
            name={"name"}
            label={"values"}
            colSpan={"full"}
          />
          <button
            onClick={() => handleRemove(index)}
            type="button"
            className="text-red-500"
          >
            x
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={allVariationsAssigned}
        style={{
          padding: "8px 12px",
          background: allVariationsAssigned ? "#ccc" : "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: allVariationsAssigned ? "not-allowed" : "pointer",
          marginTop: "8px",
        }}
      >
        Add New Variation
      </button>
      <input
        type="hidden"
        name="variationValues"
        value={JSON.stringify(rows)}
      />
    </div>
  );
}
