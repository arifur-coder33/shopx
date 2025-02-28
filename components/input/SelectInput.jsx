"use client";
import { useState } from "react";

const variationsList = [
  { id: "454545", name: "Size" },
  { id: "656565", name: "Color" },
  { id: "767676", name: "Material" },
]; // Example variations with IDs

export default function VariationInput() {
  const [rows, setRows] = useState([{ variation: "", values: "" }]);

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
  console.log(variationValues);
  return (
    <div className="p-4 border border-gray-300 rounded-lg max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-2">Assign Variations</h2>
      {rows.map((row, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <select
            value={row.variation}
            onChange={(e) => handleVariationChange(index, e.target.value)}
            className="flex-1 p-2 border border-gray-300 rounded-md"
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
          </select>
          <input
            placeholder="Enter values (comma-separated)"
            value={row.values}
            onChange={(e) => handleValueChange(index, e.target.value)}
            className="flex-2 p-2 border border-gray-300 rounded-md"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={allVariationsAssigned}
        className={`p-2 px-4 ${
          allVariationsAssigned
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-500 text-white hover:bg-blue-600"
        } rounded-md mt-2`}
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
