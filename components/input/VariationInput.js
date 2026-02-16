"use client";
import { getVariations } from "@/backend/serverActions/variantionAction";
import { useEffect, useState } from "react";
import FloatingInput from "./FloatingInput";
import SearchableDropdown from "./SearchableDropdown";

// const variationsList = [
//   { id: "454545", name: "Size" },
//   { id: "656565", name: "Color" },
//   { id: "767676", name: "Material" },
// ]; // Example variations with IDs

export default function VariationInput({
  colSpan,
  defaultValue,
  label,
  labelNote,
  name,
}) {
  const [rows, setRows] = useState([{ variation: "", value: "" }]);
  const [variationsList, setVariationsList] = useState([]);
  const [selectedVariation, setSelectedVariation] = useState([
    { variation: "", value: "" },
  ]);

  // useEffect(() => {
  //   async function getVariationsList() {
  //     const data = await getVariations();
  //     setVariationsList(data?.data);
  //   }
  //   getVariationsList();
  // }, []);

  useEffect(() => {
    if (defaultValue) {
      setRows(defaultValue);
      // setSelectedVariation(defaultValue.map((item) => item.variation));
      // setVariationsList(defaultValue.map((item) => item.variation));
    }
  }, [defaultValue]);
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
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows[index].value = value;
      return updatedRows;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { variation: "", value: "" }]);
  };

  const variationValues = rows
    .filter((row) => row.variation && row.value)
    .map((row) => ({
      variationId: variationsList.find((v) => v.name === row.variation)?.id,
      value: row.value.split(",").map((val) => val.trim()),
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
      }}
      className={` col-span-${colSpan}`}
    >
      <h2 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
        {label}
      </h2>
      <p className="text-sm text-slate-500">{labelNote}</p>
      {rows.map((row, index) => (
        // console.log("row", index, rows[index]?.variation),
        <div
          key={index}
          className="flex flex-row gap-2 items-center align-baseline"
        >
          <SearchableDropdown
            index={index}
            onSelect={onSelect}
            loadLists={loadVariations}
            dropDownLists={variationsList}
            name={""}
            label={" "}
            // defaultId={rows[index]?.variation}
            defaultId={row.variation}
            addForm={"VariationForm"}
          />

          <FloatingInput
            label={"Variation Value"}
            onChange={(e) => handleValueChange(index, e.target.value)}
            defaultValue={row.value}
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
        style={{
          padding: "8px 12px",
          background: "#007bff",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          marginTop: "8px",
        }}
      >
        Add New Variation
      </button>
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          rows.filter((v) => v.variation !== "" && v.value.trim() !== ""),
        )} // Filter out empty variations
      />
    </div>
  );
}
