"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- Dynamically import Heroicons ---
const FileInput = dynamic(() => import("./FileInput"), {
  ssr: false,
  loading: () => <span>Loading...</span>, // Correct: Use a React component
});

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
  () => import("@heroicons/react/24/solid").then((mod) => mod.CheckCircleIcon),
  { loading: () => loadingIconFallback("h-6 w-6") }
);
const DynamicTrashIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.TrashIcon),
  { loading: () => loadingIconFallback("h-5 w-5") }
);
const DynamicPhotoIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.PhotoIcon),
  { loading: () => loadingIconFallback("h-8 w-8") }
);
const DynamicXCircleIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.XCircleIcon),
  { loading: () => loadingIconFallback("h-4 w-4") }
);
// --- ---

// --- generateCombinations function (remains the same) ---
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

export default function ProductVariationInput({
  colSpan = "full",
  variationList,
  initialHasVariations = false,
  name,
}) {
  // State to control if variations are fundamentally enabled
  const [hasVariationsEnabled, setHasVariationsEnabled] =
    useState(initialHasVariations);
  // State to control if the (enabled) variation section is expanded or collapsed
  const [isSectionExpanded, setIsSectionExpanded] =
    useState(initialHasVariations);

  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [rows, setRows] = useState([]);
  console.log(JSON.stringify(selectedValues), "selectedValues");
  // --- Effect to clear state if variations get disabled ---
  useEffect(() => {
    if (!hasVariationsEnabled) {
      // Ensure dependent states are cleared if variations are disabled
      if (rows.length > 0) setRows([]);
      if (Object.keys(selectedValues).length > 0) setSelectedValues({});
      if (Object.keys(expandedCategories).length > 0) setExpandedCategories({});
    }
    // We don't clear automatically just because variationList changes,
    // row generation effect handles updates based on selections.
  }, [hasVariationsEnabled]);

  // --- Handlers ---
  const toggleCategoryExpand = (name) => {
    setExpandedCategories((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSelectValue = useCallback((category, valueString) => {
    setSelectedValues((prev) => {
      const currentValues = prev[category] || [];
      const alreadySelected = currentValues.includes(valueString);
      let updatedCategoryValues;
      if (alreadySelected) {
        updatedCategoryValues = currentValues.filter((v) => v !== valueString);
      } else {
        updatedCategoryValues = [...currentValues, valueString].sort();
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

  // --- Effect to generate rows (only if enabled and selections exist) ---
  useEffect(() => {
    if (!hasVariationsEnabled) {
      // Ensure rows are empty if variations disabled
      if (rows.length > 0) setRows([]);
      return; // Exit early
    }

    // If no variation types are selected, clear rows and exit
    if (Object.keys(selectedValues).length === 0) {
      if (rows.length > 0) setRows([]);
      return;
    }

    const generatedCombinations = generateCombinations(selectedValues);

    const newRows = generatedCombinations.map((combo) => {
      const sortedCombo = [...combo].sort((a, b) =>
        a.category.localeCompare(b.category)
      );
      const reactKeyId = sortedCombo
        .map((c) => `${c.category}:${c.value}`)
        .join("|");
      const variationValues = combo.reduce((acc, c) => {
        acc[c.category] = c.value;
        return acc;
      }, {});
      const matcherId = combo
        .map((c) => c.value)
        .map((val) => val.toLowerCase().replace(/\s+/g, ""))
        .sort()
        .join("-");
      return {
        id: reactKeyId,
        combination: combo,
        variationValues: variationValues,
        matcherId: matcherId,
        sku: "",
        price: "",
        qty: "",
        image: null,
        imageUrl: null,
      };
    });

    // Merge with previous rows to preserve data
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
  }, [selectedValues, hasVariationsEnabled]); // Re-run when selections change or enabled status changes

  // --- UPDATED HANDLER: Toggle Variations Enabled (Checkbox) ---
  const handleToggleVariations = (event) => {
    const isEnabled = event.target.checked;
    setHasVariationsEnabled(isEnabled);

    if (isEnabled) {
      // When enabling, default to expanding the section
      setIsSectionExpanded(true);
    } else {
      // When disabling, ensure section is collapsed and clear all variation state
      setIsSectionExpanded(false);
      setSelectedValues({});
      setRows([]);
      setExpandedCategories({});
    }
  };

  // --- NEW HANDLER: Toggle Section Expansion (Title/Chevron Click) ---
  const toggleSectionExpand = () => {
    // Only allow toggling if variations are actually enabled via the checkbox
    if (hasVariationsEnabled) {
      setIsSectionExpanded((prev) => !prev);
    }
  };

  // --- Other handlers (handleDeleteRow, handleImageChange, etc. - remain the same) ---
  const handleDeleteRow = (rowIdToDelete) => {
    const rowToDelete = rows.find((row) => row.id === rowIdToDelete);
    if (!rowToDelete) return;

    const updatedRows = rows.filter((row) => row.id !== rowIdToDelete);
    setRows(updatedRows);

    const potentialNextSelectedValues = {};
    updatedRows.forEach((row) => {
      Object.entries(row.variationValues).forEach(([category, value]) => {
        if (!potentialNextSelectedValues[category])
          potentialNextSelectedValues[category] = new Set();
        potentialNextSelectedValues[category].add(value);
      });
    });

    const nextSelectedValues = {};
    Object.keys(potentialNextSelectedValues)
      .sort()
      .forEach((category) => {
        nextSelectedValues[category] = Array.from(
          potentialNextSelectedValues[category]
        ).sort();
      });

    const sortObjectArrays = (obj) => {
      const sortedObj = {};
      Object.keys(obj)
        .sort()
        .forEach((key) => {
          sortedObj[key] = Array.isArray(obj[key]) ? [...obj[key]].sort() : [];
        });
      return sortedObj;
    };

    const currentSelectedValuesSorted = sortObjectArrays(selectedValues);

    if (
      JSON.stringify(sortObjectArrays(nextSelectedValues)) !==
      JSON.stringify(currentSelectedValuesSorted)
    ) {
      setSelectedValues(nextSelectedValues);
    }
  };

  const handleImageChange = (selectedImages, rowId) => {
    const image = selectedImages[0]; // Assuming single select for now
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.id === rowId ? { ...row, image: image?.id } : row
      )
    );
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
  // --- ---

  // --- Table Headers calculation (only relevant when variations are enabled) ---
  const tableHeaders = useMemo(() => {
    if (!hasVariationsEnabled) return [];
    return Object.keys(selectedValues)
      .filter((key) => selectedValues[key]?.length > 0)
      .sort();
  }, [hasVariationsEnabled, selectedValues]);

  // --- Animation variants ---
  const rowVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
  };
  const sectionVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      marginTop: 0,
      marginBottom: 0,
      paddingTop: 0,
      paddingBottom: 0,
    },
    visible: {
      opacity: 1,
      height: "auto",
      marginTop: "0rem",
      marginBottom: "0rem",
      paddingTop: "1.5rem",
      paddingBottom: "0rem",
    },
  }; // Adjust pt/pb as needed
  // --- ---
  {
    console.log(rows, "rows");
  }
  return (
    <div className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan}`}>
      <div className="flex justify-between items-center border-b pb-3">
        {/* --- Left Side: Clickable Title + Expand/Collapse Icon --- */}
        <button
          type="button"
          onClick={toggleSectionExpand}
          disabled={!hasVariationsEnabled} // Disable click if variations aren't enabled
          className={`flex items-center space-x-2 text-left focus:outline-none group disabled:cursor-not-allowed ${
            hasVariationsEnabled ? "cursor-pointer" : ""
          }`}
          aria-expanded={hasVariationsEnabled && isSectionExpanded} // Correct aria-expanded state
          aria-controls="variation-content-area"
        >
          <h2 className="text-2xl font-bold text-gray-800 group-hover:text-indigo-700 transition-colors duration-150">
            Product Variations
          </h2>
          {/* Conditionally render Chevron Icon only if variations are enabled */}
          {hasVariationsEnabled && (
            <span className="text-gray-500 group-hover:text-indigo-600 transition-colors duration-150 shrink-0">
              {isSectionExpanded ? (
                <DynamicChevronUpIcon className="h-5 w-5" />
              ) : (
                <DynamicChevronDownIcon className="h-5 w-5" />
              )}
            </span>
          )}
        </button>

        {/* --- Right Side: Has Variations Toggle --- */}
        <label className="flex items-center space-x-2 cursor-pointer shrink-0 pl-4">
          <input
            type="checkbox"
            checked={hasVariationsEnabled}
            onChange={handleToggleVariations}
            className="h-5 w-5 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="text-sm font-medium text-gray-700">
            Has Variations
          </span>
        </label>
      </div>
      {/* --- Conditionally Render Variation Content based on BOTH flags --- */}
      <AnimatePresence initial={false}>
        {/* Only render the motion div if variations enabled AND section is expanded */}
        {hasVariationsEnabled && isSectionExpanded && (
          <motion.div
            id="variation-content-area"
            key="variation-content"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={sectionVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="space-y-8 overflow-hidden" // Contains the grid and table/placeholders
          >
            {/* Variations Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variationList?.map((cat) => {
                if (!cat || !cat.variation) return null;
                const categoryName = cat.variation.name;
                const isCatExpanded = expandedCategories[categoryName];
                const selectionCount =
                  selectedValues[categoryName]?.length ?? 0;

                return (
                  <div
                    key={cat.variation.id}
                    className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(categoryName)}
                      className={`flex items-center justify-between w-full p-4 text-left transition-colors duration-150 ease-in-out ${
                        isCatExpanded ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {selectionCount > 0 ? (
                          <DynamicCheckCircleIcon className="h-6 w-6 text-indigo-600 shrink-0" />
                        ) : (
                          <span className="h-6 w-6 block border-2 border-gray-300 rounded-full shrink-0"></span>
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
                      {isCatExpanded ? (
                        <DynamicChevronUpIcon className="h-5 w-5 text-gray-500 shrink-0" />
                      ) : (
                        <DynamicChevronDownIcon className="h-5 w-5 text-gray-500 shrink-0" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isCatExpanded && (
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
                            {cat.values?.map(
                              (valueItem) =>
                                valueItem && (
                                  <label
                                    key={valueItem.id}
                                    className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        selectedValues[categoryName]?.includes(
                                          valueItem.value
                                        ) ?? false
                                      }
                                      onChange={() =>
                                        handleSelectValue(
                                          categoryName,
                                          valueItem.value
                                        )
                                      }
                                      className="h-5 w-5 rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 cursor-pointer"
                                    />
                                    <span className="text-gray-700 select-none">
                                      {valueItem.value}
                                    </span>
                                  </label>
                                )
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {/* Add a placeholder if variationList is empty/null but variations enabled */}
              {(!variationList || variationList.length === 0) &&
                hasVariationsEnabled && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-8 border border-dashed border-gray-300 rounded-lg bg-white">
                    <p className="text-sm text-gray-500">
                      No variation types (like Color, Size) have been defined
                      for this product category yet.
                    </p>
                  </div>
                )}
            </div>

            {/* Variations Table & Placeholders */}
            <AnimatePresence>
              {rows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="overflow-x-auto shadow-md rounded-lg border border-gray-200"
                >
                  <table className="min-w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-100 border-b border-gray-300 text-xs text-gray-700 uppercase tracking-wider">
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
                              <FileInput
                                multipleSelect={false}
                                key={row.id}
                                label={""}
                                name={"image"}
                                defaultValue={row.imageUrl}
                                colSpan={"full"}
                                onImageSelect={(selectedImages) =>
                                  handleImageChange(selectedImages, row.id)
                                }
                              />

                              {/* {row.imageUrl ? (
                                <div className="relative group shrink-0">
                                  <img
                                    src={row.imageUrl}
                                    alt="Variation Preview"
                                    className="h-16 w-16 rounded-md object-cover border border-gray-200"
                                  />
                                  <button
                                    onClick={() => handleRemoveImage(row.id)}
                                    className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                    aria-label="Remove image"
                                  >
                                    <DynamicXCircleIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-16 w-16 rounded-md border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-100 shrink-0">
                                  <DynamicPhotoIcon className="h-8 w-8 text-gray-400" />
                                </div>
                              )} */}
                              {/* <label className="cursor-pointer text-xs text-indigo-600 hover:text-indigo-800 font-medium underline whitespace-nowrap">
                                {row.imageUrl ? "Change" : "Upload"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleImageChange(e, row.id)}
                                  className="sr-only"
                                />
                              </label> */}
                            </div>
                          </td>
                          <td className="px-6 py-4 align-middle">
                            <input
                              type="text"
                              placeholder="-"
                              value={row.sku ?? ""}
                              onChange={(e) =>
                                handleInputChange(e, row.id, "sku")
                              }
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
                              onChange={(e) =>
                                handleInputChange(e, row.id, "price")
                              }
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
                              onChange={(e) =>
                                handleInputChange(e, row.id, "qty")
                              }
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

            {/* Placeholders within the expandable section */}
            {rows.length === 0 && Object.keys(selectedValues).length > 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <h3 className="text-lg font-medium text-gray-600">
                  No variation combinations generated.
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select values from the options above to create variations.
                </p>
              </div>
            )}
            {rows.length === 0 &&
              Object.keys(selectedValues).length === 0 &&
              variationList &&
              variationList.length > 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-600">
                    Select variation options
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Choose values like RAM, Color, etc., to generate specific
                    product variations.
                  </p>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- End Conditional Render --- */}
      <input
        name={name}
        hidden
        defaultValue={rows.length > 0 && JSON.stringify(rows)}
      />
    </div>
  );
}
