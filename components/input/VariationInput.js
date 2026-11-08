"use client";
import { getVariations } from "@/backend/serverActions/variantionAction";
import { getSizeChartOptions } from "@/backend/serverActions/sizeChartActions";
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
  sizeChart,
  parentId,
  defaultSizeChartId,
}) {
  const [rows, setRows] = useState([{ variation: "", value: "" }]);
  const [variationsList, setVariationsList] = useState([]);
  const [chartOptions, setChartOptions] = useState(null);
  const [chartId, setChartId] = useState(defaultSizeChartId || "");
  const supportsSize = rows.some((row) => row.variation?.name?.trim().toLowerCase() === "size");

  useEffect(() => {
    if (!sizeChart) return;
    let active = true;
    getSizeChartOptions(parentId).then((options) => {
      if (active) setChartOptions({ ...options, parentId });
    }).catch(() => {
      if (active) setChartOptions({ parentId, error: true });
    });
    return () => { active = false; };
  }, [sizeChart, parentId]);
  const currentOptions = chartOptions?.parentId === parentId ? chartOptions : null;
  const showChart = supportsSize || currentOptions?.supportsSize;

  // useEffect(() => {
  //   async function getVariationsList() {
  //     const data = await getVariations();
  //     setVariationsList(data?.data);
  //   }
  //   getVariationsList();
  // }, []);

  useEffect(() => {
    if (Array.isArray(defaultValue) && defaultValue.length) {
      setRows(defaultValue);
    }
  }, [defaultValue]);
  const onSelect = (item, _itemId, index) => {
    handleVariationChange(index, item);
  };

  const handleRemove = (index) => {
    setRows((prev) => {
      const updatedRows = [...prev];
      updatedRows.splice(index, 1);
      return updatedRows;
    });
  };
  const handleVariationChange = (index, value) => {
    if (!Number.isInteger(index) || index < 0) return;
    setRows((prev) => {
      const updatedRows = [...prev];
      while (updatedRows.length <= index) {
        updatedRows.push({ variation: "", value: "" });
      }
      updatedRows[index] = { ...updatedRows[index], variation: value };
      return updatedRows;
    });
  };

  const handleValueChange = (index, value) => {
    if (!Number.isInteger(index) || index < 0) return;
    setRows((prev) => {
      const updatedRows = [...prev];
      while (updatedRows.length <= index) {
        updatedRows.push({ variation: "", value: "" });
      }
      updatedRows[index] = { ...updatedRows[index], value };
      return updatedRows;
    });
  };

  const addRow = () => {
    setRows((prev) => [...prev, { variation: "", value: "" }]);
  };

  const loadVariations = async () => {
    const getData = await getVariations();

    setVariationsList(getData?.data || []);
    return getData;
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
          rows.filter(
            (v) => v.variation && String(v.value || "").trim() !== "",
          ),
        )} // Filter out empty variations
      />
      {sizeChart && currentOptions && !currentOptions.error && (
        showChart ? <label className="mt-4 grid gap-1 text-sm font-medium">
          Size chart
          <select name="sizeChartId" value={chartId} onChange={(event) => setChartId(event.target.value)} className="rounded border border-border bg-surface p-2">
            <option value="">{currentOptions.inheritedName ? `Inherit: ${currentOptions.inheritedName}` : "No chart assigned"}</option>
            {currentOptions.charts.map((chart) => <option key={chart.id} value={chart.id}>{chart.name}</option>)}
          </select>
        </label> : <input type="hidden" name="sizeChartId" value="" />
      )}
      {sizeChart && supportsSize && <input type="hidden" name="sizeVariationId" value={rows.find((row) => row.variation?.name?.trim().toLowerCase() === "size")?.variation.id} />}
      {sizeChart && currentOptions?.error && <p className="mt-2 text-sm text-danger">Size charts could not be loaded.</p>}
    </div>
  );
}
