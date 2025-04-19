"use client";
import { getVariations } from "@/backend/serverActions/variantionAction";
import { useEffect, useState } from "react";
import SearchableDropdown from "./SearchableDropdown";

// const variationsList = [
//   { id: "454545", name: "Size" },
//   { id: "656565", name: "Color" },
//   { id: "767676", name: "Material" },
// ]; // Example variations with IDs

export default function VariationInput() {
  const [rows, setRows] = useState([{ variation: "", values: "" }]);
  const [variationsList, setVariationsList] = useState([]);
  useEffect(() => {
    async function getVariationsList() {
      const data = await getVariations();
      setVariationsList(data?.data);
    }
    getVariationsList();
  }, []);
  const handleVariationChange = (index, value) => {
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index].variation = value;
      return updatedRows;
    });
  };

  const handleValueChange = (index, value) => {
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index].values = value;
      return updatedRows;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { variation: "", values: "" }]);
  };

  const assignedVariations = rows.map((row) => row.variation);
  const allVariationsAssigned =
    assignedVariations.length >= variationsList.length;
  const variationValues = rows
    .filter((row) => row.variation && row.values)
    .map((row) => ({
      variationId: variationsList.find((v) => v.name === row.variation)?.id,
      value: row.values.split(",").map((val) => val.trim()),
    }));

  const loadVariations = async () => {
    const getData = await getVariations();
    return getData?.data || [];
  };

  return (
    <div
      style={{
        padding: "16px",
        border: "1px solid #ddd",
        borderRadius: "8px",
        maxWidth: "500px",
        margin: "auto",
      }}
    >
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
        Assign Variations
      </h2>
      {rows.map((row, index) => (
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
            dropDownLists={loadVariations}
            name={"variation"}
            label={"Assign Variation"}
            // defaultId={data?.[field.name].id}
            addForm={"VariationForm"}
          />
          <input
            placeholder="Enter values (comma-separated)"
            value={row.values}
            onChange={(e) => handleValueChange(index, e.target.value)}
            style={{
              flex: 2,
              padding: "8px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          />
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
        value={JSON.stringify(variationValues)}
      />
    </div>
  );
}
