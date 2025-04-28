"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic"; // Import dynamic
import { useCallback, useEffect, useState } from "react";

// --- Dynamically import Heroicons ---
// Provide simple loading fallbacks matching icon size to minimize layout shift
const loadingIconFallback = (className = "h-5 w-5") => (
  <span className={className}></span>
);

const DynamicChevronDownIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.ChevronDownIcon),
  { loading: () => loadingIconFallback("h-5 w-5") }
);

const DynamicChevronUpIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.ChevronUpIcon),
  { loading: () => loadingIconFallback("h-5 w-5") }
);

const DynamicCheckCircleIcon = dynamic(
  () =>
    // Added this one as it's used
    import("@heroicons/react/24/solid").then((mod) => mod.CheckCircleIcon),
  { loading: () => loadingIconFallback("h-6 w-6") } // Match usage size
);

const DynamicTrashIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.TrashIcon),
  { loading: () => loadingIconFallback("h-5 w-5") }
);

const DynamicPhotoIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.PhotoIcon),
  { loading: () => loadingIconFallback("h-8 w-8") } // Match usage size
);

const DynamicXCircleIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.XCircleIcon),
  { loading: () => loadingIconFallback("h-4 w-4") } // Match usage size
);

// --- Your variationsData and generateCombinations remain the same ---
const variationsData = [
  { variation: { id: "v1", name: "RAM" }, values: ["4 GB", "16 GB"] },
  { variation: { id: "v2", name: "Storage" }, values: ["8 GB", "32 GB"] },
  { variation: { id: "v3", name: "Color" }, values: ["Red", "Yellow", "Blue"] },
];

const generateCombinations = (selected) => {
  const selectedCategories = Object.entries(selected).filter(
    ([_, values]) => values.length > 0
  );
  if (selectedCategories.length === 0) return [];
  selectedCategories.sort(([catA], [catB]) => catA.localeCompare(catB));
  return selectedCategories.reduce((acc, [category, values]) => {
    if (acc.length === 0) {
      return values.map((value) => [{ category, value }]);
    }
    const newAcc = [];
    acc.forEach((combo) => {
      values.forEach((value) => {
        newAcc.push([...combo, { category, value }]);
      });
    });
    return newAcc;
  }, []);
};
// --- ---

export default function ProductVariationInput({ colSpan = "full" }) {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [rows, setRows] = useState([]);

  // --- Your handlers (toggleCategoryExpand, handleSelectValue, etc.) remain the same ---
  const toggleCategoryExpand = (name) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSelectValue = useCallback((category, value) => {
    setSelectedValues((prev) => {
      const currentValues = prev[category] || [];
      const alreadySelected = currentValues.includes(value);
      let updatedCategoryValues;
      if (alreadySelected) {
        updatedCategoryValues = currentValues.filter((v) => v !== value);
      } else {
        updatedCategoryValues = [...currentValues, value].sort();
      }
      const nextState = { ...prev };
      if (updatedCategoryValues.length === 0) {
        delete nextState[category];
      } else {
        nextState[category] = updatedCategoryValues;
      }
      return nextState;
    });
  }, []);

  useEffect(() => {
    const generatedCombinations = generateCombinations(selectedValues);
    const newRows = generatedCombinations.map((combo) => {
      const sortedCombo = [...combo].sort((a, b) =>
        a.category.localeCompare(b.category)
      );
      const id = sortedCombo.map((c) => `${c.category}:${c.value}`).join("|");
      const variationValues = combo.reduce((acc, c) => {
        acc[c.category] = c.value;
        return acc;
      }, {});
      return {
        id,
        combination: combo,
        variationValues,
        sku: "",
        price: "",
        qty: "",
        image: null,
        imageUrl: null,
      };
    });
    setRows((prevRows) => {
      const prevRowsMap = new Map(prevRows.map((row) => [row.id, row]));
      return newRows.map((newRow) => {
        const existingRow = prevRowsMap.get(newRow.id);
        return existingRow
          ? {
              ...newRow,
              sku: existingRow.sku,
              price: existingRow.price,
              qty: existingRow.qty,
              image: existingRow.image,
              imageUrl: existingRow.imageUrl,
            }
          : newRow;
      });
    });
  }, [selectedValues]);

  const handleDeleteRow = (rowIdToDelete) => {
    const rowToDelete = rows.find((row) => row.id === rowIdToDelete);
    if (!rowToDelete) return;
    const updatedRows = rows.filter((row) => row.id !== rowIdToDelete);
    const potentialNextSelectedValues = {};
    updatedRows.forEach((row) => {
      Object.entries(row.variationValues).forEach(([category, value]) => {
        if (!potentialNextSelectedValues[category])
          potentialNextSelectedValues[category] = [];
        if (!potentialNextSelectedValues[category].includes(value))
          potentialNextSelectedValues[category].push(value);
      });
    });
    const sortObjectArrays = (obj) => {
      const sortedObj = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sortedObj[key] = [...obj[key]].sort();
        });
      return sortedObj;
    };
    const nextSelectedValues = sortObjectArrays(potentialNextSelectedValues);
    const currentSelectedValuesSorted = sortObjectArrays(selectedValues);
    const hasSelectedValuesChanged =
      JSON.stringify(nextSelectedValues) !==
      JSON.stringify(currentSelectedValuesSorted);
    setRows(updatedRows);
    if (hasSelectedValuesChanged) setSelectedValues(nextSelectedValues);
  };

  const handleImageChange = (e, rowId) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === rowId
            ? { ...row, image: file, imageUrl: reader.result }
            : row
        )
      );
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveImage = (rowId) => {
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, image: null, imageUrl: null } : row
      )
    );
  };

  const handleInputChange = (e, rowId, field) => {
    const { value } = e.target;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  };

  const tableHeaders = Object.keys(selectedValues)
    .filter((key) => selectedValues[key]?.length > 0)
    .sort();

  const rowVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
  };
  // --- ---

  return (
    <div
      className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan} space-y-8`}
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">
        Product Variations
      </h2>

      {/* Variations Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {variationsData.map((cat) => {
          const categoryName = cat.variation.name;
          const isExpanded = expandedCategories[categoryName];
          const selectionCount = selectedValues[categoryName]?.length ?? 0;

          return (
            <div
              key={cat.variation.id}
              className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCategoryExpand(categoryName)}
                className={`flex items-center justify-between w-full p-4 text-left transition-colors duration-150 ease-in-out ${
                  isExpanded ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  {selectionCount > 0 ? (
                    // Use Dynamic Icon
                    <DynamicCheckCircleIcon className="h-6 w-6 text-indigo-600 flex-shrink-0" />
                  ) : (
                    <span className="h-6 w-6 block border-2 border-gray-300 rounded-full flex-shrink-0"></span>
                  )}
                  <span className="text-lg font-semibold text-gray-700">
                    {categoryName}
                  </span>
                  {selectionCount > 0 && (
                    <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {selectionCount} selected
                    </span>
                  )}
                </div>
                {/* Use Dynamic Icons */}
                {isExpanded ? (
                  <DynamicChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <DynamicChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="content"
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                      open: { opacity: 1, height: "auto" },
                      collapsed: { opacity: 0, height: 0 },
                    }}
                    transition={{
                      duration: 0.3,
                      ease: [0.04, 0.62, 0.23, 0.98],
                    }}
                    className="border-t border-gray-200"
                  >
                    <div className="p-4 space-y-3">
                      {cat.values.map((value) => (
                        <label
                          key={value}
                          className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={
                              selectedValues[categoryName]?.includes(value) ??
                              false
                            }
                            onChange={() =>
                              handleSelectValue(categoryName, value)
                            }
                            className="h-5 w-5 rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
                          />
                          <span className="text-gray-700 select-none">
                            {value}
                          </span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Variations Table */}
      <AnimatePresence>
        {rows.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-8 overflow-x-auto shadow-md rounded-lg border border-gray-200"
          >
            <table className="min-w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-100 border-b border-gray-300 text-xs text-gray-700 uppercase tracking-wider">
                {/* Table Headers remain the same */}
                <tr>
                  {tableHeaders.map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-6 py-3 font-semibold"
                    >
                      {header}
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Image
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    SKU
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Price
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Qty
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Action
                  </th>
                </tr>
              </thead>
              <motion.tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={`${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-indigo-50 transition-colors`}
                  >
                    {/* Table variation value cells remain the same */}
                    {tableHeaders.map((header) => (
                      <td
                        key={`${row.id}-${header}`}
                        className="px-6 py-4 whitespace-nowrap font-medium text-gray-900"
                      >
                        {row.variationValues[header]}
                      </td>
                    ))}
                    <td className="px-6 py-4 align-middle">
                      <div className="flex items-center space-x-3">
                        {row.imageUrl ? (
                          <div className="relative group flex-shrink-0">
                            <img
                              src={row.imageUrl}
                              alt="Variation Preview"
                              className="h-16 w-16 rounded-md object-cover border border-gray-200"
                            />
                            <button
                              onClick={() => handleRemoveImage(row.id)}
                              className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                              aria-label="Remove image"
                            >
                              {/* Use Dynamic Icon */}
                              <DynamicXCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-100 flex-shrink-0">
                            {/* Use Dynamic Icon */}
                            <DynamicPhotoIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 font-medium underline">
                          {row.imageUrl ? "Change" : "Upload"}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, row.id)}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </td>
                    {/* Input cells remain the same */}
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="text"
                        placeholder="-"
                        value={row.sku ?? ""}
                        onChange={(e) => handleInputChange(e, row.id, "sku")}
                        className="w-28 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="number"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        value={row.price ?? ""}
                        onChange={(e) => handleInputChange(e, row.id, "price")}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <input
                        type="number"
                        placeholder="0"
                        step="1"
                        min="0"
                        value={row.qty ?? ""}
                        onChange={(e) => handleInputChange(e, row.id, "qty")}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                      />
                    </td>
                    <td className="px-6 py-4 align-middle">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(row.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors duration-150 ease-in-out p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        aria-label="Delete variation"
                      >
                        {/* Use Dynamic Icon */}
                        <DynamicTrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placeholders remain the same */}
      {rows.length === 0 && Object.keys(selectedValues).length > 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg mt-6">
          <h3 className="text-lg font-medium text-gray-600">
            No variation combinations generated.
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Select values from the options above to create variations.
          </p>
        </div>
      )}
      {rows.length === 0 && Object.keys(selectedValues).length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg mt-6">
          <h3 className="text-lg font-medium text-gray-600">
            Select variation options
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Choose values like RAM, Color, etc., to generate specific product
            variations.
          </p>
        </div>
      )}
    </div>
  );
}
