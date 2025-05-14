"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- Dynamically import Components & Icons ---
const FileInput = dynamic(() => import("./FileInput"), {
  // Adjust path to your FileInput
  ssr: false,
  loading: () => <span className="h-12 w-12 block"></span>,
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
  { loading: () => loadingIconFallback("h-5 w-5") }
);
const DynamicTrashIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.TrashIcon),
  { loading: () => loadingIconFallback("h-4 w-4") }
);
const DynamicPhotoIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.PhotoIcon),
  { loading: () => loadingIconFallback("h-6 w-6") }
);
const DynamicXCircleIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.XCircleIcon),
  { loading: () => loadingIconFallback("h-4 w-4") }
);
// --- ---

// --- generateCombinations function (assumed to be correct from your snippet) ---
const generateCombinations = (processedSelections) => {
  if (!processedSelections || processedSelections.length === 0) return [];
  processedSelections.sort(([varAObj], [varBObj]) =>
    varAObj.name.localeCompare(varBObj.name)
  );
  return processedSelections.reduce((acc, [variationObj, valueObjects]) => {
    const sortedValueObjects = Array.isArray(valueObjects)
      ? [...valueObjects].sort((a, b) =>
          String(a.value).localeCompare(String(b.value))
        )
      : [];
    if (acc.length === 0) {
      return sortedValueObjects.map((valueObj) => [
        { variation: variationObj, value: valueObj },
      ]);
    }
    const newAcc = [];
    acc.forEach((combo) => {
      sortedValueObjects.forEach((valueObj) => {
        newAcc.push([...combo, { variation: variationObj, value: valueObj }]);
      });
    });
    return newAcc;
  }, []);
};
// --- ---

// --- Component Definition ---
export default function ProductVariationInput({
  colSpan = "full",
  variationList, // Array of { variation: {id, name}, values: [{id, value}, ...] }
  initialHasVariations = false,
  initialCombinations = [], // Array of row data from DB
  name = "productVariation", // Name for the hidden input
}) {
  const derivedInitialEnabled =
    initialHasVariations ||
    (initialCombinations && initialCombinations.length > 0);

  const [hasVariationsEnabled, setHasVariationsEnabled] = useState(
    derivedInitialEnabled
  );
  const [isSectionExpanded, setIsSectionExpanded] = useState(
    derivedInitialEnabled
  );
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedValues, setSelectedValues] = useState({}); // { VariationName: [ValueString, ...], ... }
  const [rows, setRows] = useState([]); // Array of { uiKey, dbId, combination, ... }
  const [isInitialized, setIsInitialized] = useState(false);

  // --- Effect for Initial Data Loading ---
  useEffect(() => {
    if (
      initialCombinations &&
      initialCombinations.length > 0 &&
      !isInitialized
    ) {
      const rowsForState = initialCombinations.map((initRow) => {
        const sortedCombo = [...(initRow.combination || [])].sort((a, b) =>
          a.variation.name.localeCompare(b.variation.name)
        );
        const uiKey = sortedCombo
          .map((c) => `${c.variation.name}:${c.value.value}`)
          .join("|");

        // Ensure variationValues is present or derived for consistency
        let currentVariationValues = initRow.variationValues;
        if (!currentVariationValues && Array.isArray(initRow.combination)) {
          currentVariationValues = initRow.combination.reduce((acc, c) => {
            if (c.variation?.name && c.value?.value !== undefined) {
              acc[c.variation.name] = String(c.value.value);
            }
            return acc;
          }, {});
        }

        return {
          uiKey: uiKey,
          dbId: initRow.id, // This is the original database ID
          combination: initRow.combination || [],
          variationValues: currentVariationValues || {},
          matcherId: initRow.matcherId || "", // Ensure matcherId is present
          sku: initRow.sku || "",
          price:
            initRow.price !== undefined && initRow.price !== null
              ? String(initRow.price)
              : "",
          qty:
            initRow.qty !== undefined && initRow.qty !== null
              ? String(initRow.qty)
              : "",
          image: initRow.image || null, // Expects {id, name} or null
          imageUrl: initRow.imageUrl || null,
        };
      });

      setRows(rowsForState);

      const derivedSelectedValues = {};
      initialCombinations.forEach((row) => {
        if (Array.isArray(row.combination)) {
          row.combination.forEach(({ variation, value }) => {
            if (variation?.name && value?.value !== undefined) {
              const varName = variation.name;
              const valStr = String(value.value);
              if (!derivedSelectedValues[varName]) {
                derivedSelectedValues[varName] = new Set();
              }
              derivedSelectedValues[varName].add(valStr);
            }
          });
        }
      });
      Object.keys(derivedSelectedValues).forEach((key) => {
        derivedSelectedValues[key] = Array.from(
          derivedSelectedValues[key]
        ).sort();
      });
      setSelectedValues(derivedSelectedValues);

      if (!hasVariationsEnabled) setHasVariationsEnabled(true);
      if (!isSectionExpanded) setIsSectionExpanded(true);
      const derivedExpandedCategories = {};
      Object.keys(derivedSelectedValues).forEach((key) => {
        derivedExpandedCategories[key] = true;
      });
      setExpandedCategories(derivedExpandedCategories);
      setIsInitialized(true);
    }
  }, [
    initialCombinations,
    isInitialized,
    hasVariationsEnabled,
    isSectionExpanded,
  ]);

  // Effect to clear state when variations are disabled *after* initialization
  useEffect(() => {
    if (!hasVariationsEnabled && isInitialized) {
      if (rows.length > 0) setRows([]);
      if (Object.keys(selectedValues).length > 0) setSelectedValues({});
      if (Object.keys(expandedCategories).length > 0) setExpandedCategories({});
      if (isSectionExpanded) setIsSectionExpanded(false);
      // setIsInitialized(false); // Optional: reset if re-init is desired on re-enable
    }
  }, [
    hasVariationsEnabled,
    isInitialized,
    rows.length,
    selectedValues,
    expandedCategories,
    isSectionExpanded,
  ]);

  const toggleCategoryExpand = (variationName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [variationName]: !prev[variationName],
    }));
  };

  const handleSelectValue = useCallback(
    (variationName, valueString) => {
      setSelectedValues((prev) => {
        const currentValues = prev[variationName] || [];
        const alreadySelected = currentValues.includes(valueString);
        let updatedVariationValues;
        if (alreadySelected) {
          updatedVariationValues = currentValues.filter(
            (v) => v !== valueString
          );
        } else {
          updatedVariationValues = [...currentValues, valueString].sort();
        }
        const nextState = { ...prev };
        if (updatedVariationValues.length === 0) {
          delete nextState[variationName];
        } else {
          nextState[variationName] = updatedVariationValues;
        }
        return nextState;
      });
      if (!isInitialized) setIsInitialized(true);
    },
    [isInitialized]
  );

  const variationListMap = useMemo(() => {
    const map = new Map();
    if (variationList && Array.isArray(variationList)) {
      variationList.forEach((variationItem) => {
        if (variationItem?.variation?.name) {
          map.set(variationItem.variation.name, variationItem);
        }
      });
    }
    return map;
  }, [variationList]);

  // Effect to generate/update table rows based on selected values
  // --- Effect to generate/update table rows based on changes in selected values ---
  useEffect(() => {
    // --- Pre-conditions ---
    if (!hasVariationsEnabled || !isInitialized) {
      // If variations are disabled OR the component hasn't finished its initial load,
      // don't proceed with generating rows.
      if (!hasVariationsEnabled && rows.length > 0 && isInitialized) {
        // If disabled after init, ensure rows are cleared (might be redundant, but safe)
        console.log(
          "ProductVariationInput (useEffect selectedValues): Variations disabled after init, clearing rows."
        );
        setRows([]);
      }
      return; // Exit early
    }

    // If no variation values are selected at all, clear the rows
    if (Object.keys(selectedValues).length === 0) {
      if (rows.length > 0) {
        console.log(
          "ProductVariationInput (useEffect selectedValues): No values selected, clearing rows."
        );
        setRows([]); // Clear existing rows
      }
      return; // Exit early
    }
    console.log(
      "ProductVariationInput (useEffect selectedValues): Processing selectedValues:",
      JSON.stringify(selectedValues, null, 2)
    );

    // --- Process Selections ---
    const processedSelections = Object.entries(selectedValues)
      .map(([variationName, selectedValueStrings]) => {
        const variationItem = variationListMap.get(variationName);
        if (!variationItem?.variation || !Array.isArray(variationItem.values)) {
          console.warn(
            `ProductVariationInput (useEffect selectedValues): Variation data missing or invalid for: ${variationName}`
          );
          return null;
        }
        const valueMap = new Map(
          variationItem.values.map((v) => [String(v.value), v])
        );
        const selectedValueObjects = selectedValueStrings
          .map((valueString) => valueMap.get(valueString))
          .filter(Boolean);
        if (selectedValueObjects.length === 0) return null;
        return [variationItem.variation, selectedValueObjects];
      })
      .filter(Boolean);

    // If after processing, there are no valid selections left, clear rows and exit
    if (processedSelections.length === 0) {
      if (rows.length > 0) {
        console.log(
          "ProductVariationInput (useEffect selectedValues): No valid processed selections, clearing rows."
        );
        setRows([]);
      }
      return;
    }

    // --- Generate Combinations ---
    const generatedCombinations = generateCombinations(processedSelections);

    // --- Format New Rows (newRowsData) ---
    // This step creates the basic structure for each combination based on current selections.
    // For these newly structured rows, dbId is null and sku, price, etc., are empty
    // because this data will be filled in during the merge step if the combination existed before.
    const newRowsData = generatedCombinations.map((combo) => {
      const sortedCombo = [...combo].sort((a, b) =>
        a.variation.name.localeCompare(b.variation.name)
      );
      const uiKey = sortedCombo
        .map((c) => `${c.variation.name}:${c.value.value}`)
        .join("|");
      const variationValues = combo.reduce((acc, c) => {
        acc[c.variation.name] = String(c.value.value);
        return acc;
      }, {});
      const matcherId = combo
        .map((c) => String(c.value.value))
        .map((val) => val.toLowerCase().replace(/\s+/g, ""))
        .sort()
        .join("-");

      return {
        uiKey: uiKey,
        dbId: null, // Intentionally null for new structures
        combination: combo,
        variationValues: variationValues,
        matcherId: matcherId,
        sku: "", // Intentionally empty
        price: "", // Intentionally empty
        qty: "", // Intentionally empty
        image: null, // Intentionally null
        imageUrl: null, // Intentionally null
      };
    });
    // This console.log is expected to show empty sku, price, etc. for newRowsData items.
    console.log(
      "ProductVariationInput (useEffect selectedValues): newRowsData (structures from current selections, with empty data fields):",
      JSON.stringify(newRowsData, null, 2)
    );

    // --- Merge with Previous Rows ---
    // This is where data from `initialCombinations` (if any match the uiKey)
    // or user-entered data from previous interactions is preserved.
    setRows((prevRows) => {
      console.log(
        "ProductVariationInput (useEffect selectedValues) - MERGE STEP - prevRows (current state, should be from initial load if first time after init):",
        JSON.stringify(prevRows, null, 2)
      );
      const prevRowsMap = new Map(prevRows.map((row) => [row.uiKey, row]));
      console.log(
        "ProductVariationInput (useEffect selectedValues) - MERGE STEP - prevRowsMap keys:",
        Array.from(prevRowsMap.keys())
      );

      const finalMappedRows = newRowsData.map((newRowFromUI) => {
        // newRowFromUI is an item from `newRowsData` (with dbId:null, empty sku, etc.)
        const existingRowFromPrevState = prevRowsMap.get(newRowFromUI.uiKey);

        if (existingRowFromPrevState) {
          // A row with the same uiKey was found in the previous state.
          // This means this combination of attributes existed.
          // We preserve its dbId and data fields (sku, price, qty, image).
          console.log(
            `ProductVariationInput (useEffect selectedValues) - MERGE STEP - MATCH for uiKey: [${newRowFromUI.uiKey}]`
          );
          console.log(
            `    Existing dbId: ${existingRowFromPrevState.dbId}, SKU: ${
              existingRowFromPrevState.sku
            }, Price: ${existingRowFromPrevState.price}, Qty: ${
              existingRowFromPrevState.qty
            }, Image: ${JSON.stringify(existingRowFromPrevState.image)}`
          );
          return {
            uiKey: newRowFromUI.uiKey, // Use uiKey from the new structure (should be same)
            dbId: existingRowFromPrevState.dbId, // CRITICAL: Keep DB ID from existing
            combination: newRowFromUI.combination, // Use combination from new structure (ensures consistency if generateCombinations logic is canonical)
            variationValues: newRowFromUI.variationValues, // Use from new structure
            matcherId: newRowFromUI.matcherId, // Use from new structure
            sku: existingRowFromPrevState.sku, // KEEP data from existing
            price: existingRowFromPrevState.price, // KEEP data from existing
            qty: existingRowFromPrevState.qty, // KEEP data from existing
            image: existingRowFromPrevState.image, // KEEP data from existing
            imageUrl: existingRowFromPrevState.imageUrl, // KEEP data from existing
          };
        } else {
          // No row with this uiKey was found in the previous state.
          // This is a genuinely new combination selected by the user after initial load,
          // or the uiKey matching failed (which is the bug we're trying to find if data is lost).
          console.log(
            `ProductVariationInput (useEffect selectedValues) - MERGE STEP - NO MATCH for uiKey: [${newRowFromUI.uiKey}]. This will be a new row structure with empty data fields.`
          );
          return newRowFromUI; // Return the new row structure (with dbId:null, empty sku etc.)
        }
      });

      console.log(
        "ProductVariationInput (useEffect selectedValues) - MERGE STEP - finalMappedRows to be set to state:",
        JSON.stringify(finalMappedRows, null, 2)
      );
      return finalMappedRows;
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues, hasVariationsEnabled, variationListMap, isInitialized]); // rows was removed from deps as it's set inside; this is a common pattern for this type of effect.
  // However, be mindful of this if `rows` were needed for logic *before* `setRows`.

  const handleToggleVariations = (event) => {
    const isEnabled = event.target.checked;
    setHasVariationsEnabled(isEnabled);
    if (isEnabled) {
      setIsSectionExpanded(true);
      if (!isInitialized) setIsInitialized(true);
    } else {
      setIsSectionExpanded(false);
    }
  };

  const toggleSectionExpand = () => {
    if (hasVariationsEnabled) setIsSectionExpanded((prev) => !prev);
  };

  const handleDeleteRow = (uiKeyToDelete) => {
    const remainingRows = rows.filter((row) => row.uiKey !== uiKeyToDelete);
    setRows(remainingRows);
    if (remainingRows.length > 0) {
      const nextSelectedValues = {};
      remainingRows.forEach((row) => {
        if (Array.isArray(row.combination)) {
          row.combination.forEach(({ variation, value }) => {
            if (variation?.name && value?.value !== undefined) {
              const varName = variation.name;
              const valStr = String(value.value);
              if (!nextSelectedValues[varName])
                nextSelectedValues[varName] = new Set();
              nextSelectedValues[varName].add(valStr);
            }
          });
        }
      });
      Object.keys(nextSelectedValues).forEach((key) => {
        nextSelectedValues[key] = Array.from(nextSelectedValues[key]).sort();
      });
      if (
        JSON.stringify(selectedValues) !== JSON.stringify(nextSelectedValues)
      ) {
        setSelectedValues(nextSelectedValues);
      }
    } else {
      setSelectedValues({});
    }
    if (!isInitialized) setIsInitialized(true);
  };

  const handleImageChange = (selectedImages, rowUiKey) => {
    const imageFile =
      selectedImages && selectedImages.length > 0 ? selectedImages[0] : null;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.uiKey === rowUiKey
          ? {
              ...row,
              image: imageFile
                ? { id: imageFile.id, name: imageFile.name }
                : null,
              imageUrl: imageFile?.url || null,
            }
          : row
      )
    );
    if (!isInitialized) setIsInitialized(true);
  };

  const handleInputChange = (e, rowUiKey, field) => {
    const { value } = e.target;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.uiKey === rowUiKey ? { ...row, [field]: value } : row
      )
    );
    if (!isInitialized) setIsInitialized(true);
  };

  const tableHeaders = useMemo(() => {
    if (!hasVariationsEnabled) return [];
    return Object.keys(selectedValues)
      .filter((key) => selectedValues[key]?.length > 0)
      .sort();
  }, [hasVariationsEnabled, selectedValues]);

  const rowVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
  };
  const sectionVariants = {
    hidden: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.3, ease: "easeInOut" },
    },
    visible: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeInOut" },
    },
  };
  console.log(
    rows.map((row) => ({
      // Transform row to the format expected by the backend server action
      id: row.uiKey, // The backend expects the composite ID here
      dbId: row.dbId, // Pass dbId for backend to know if it's existing
      combination: row.combination,
      matcherId: row.matcherId,
      sku: row.sku,
      price: row.price,
      qty: row.qty,
      image: row.image?.id || null, // Send only the image ID, as backend expects
      // variationValues is not typically sent, backend derives from combination
    }))
  );
  return (
    <div className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan}`}>
      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
        <button
          type="button"
          onClick={toggleSectionExpand}
          disabled={!hasVariationsEnabled}
          className={`flex items-center space-x-2 text-left focus:outline-none group disabled:cursor-not-allowed disabled:opacity-50 ${
            hasVariationsEnabled ? "cursor-pointer" : ""
          }`}
          aria-expanded={hasVariationsEnabled && isSectionExpanded}
          aria-controls="variation-content-area"
        >
          <h2 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors duration-150">
            Product Variations
          </h2>
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
        <label className="flex items-center space-x-2 cursor-pointer shrink-0 pl-4">
          <input
            type="checkbox"
            checked={hasVariationsEnabled}
            onChange={handleToggleVariations}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="text-sm font-medium text-gray-700">
            Has Variations
          </span>
        </label>
      </div>

      <AnimatePresence initial={false}>
        {hasVariationsEnabled && isSectionExpanded && (
          <motion.div
            id="variation-content-area"
            key="variation-content"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={sectionVariants}
            className="space-y-6 overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {variationList?.map((variationItem) => {
                if (!variationItem?.variation?.name) return null;
                const variationName = variationItem.variation.name;
                const isCatExpanded = !!expandedCategories[variationName];
                const selectionCount =
                  selectedValues[variationName]?.length ?? 0;
                const categoryKey = variationItem.variation.id || variationName;
                return (
                  <div
                    key={categoryKey}
                    className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(variationName)}
                      className={`flex items-center justify-between w-full p-3 text-left transition-colors duration-150 ease-in-out ${
                        isCatExpanded ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                      aria-expanded={isCatExpanded}
                    >
                      <div className="flex items-center space-x-2">
                        {selectionCount > 0 ? (
                          <DynamicCheckCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                        ) : (
                          <span className="h-5 w-5 block border-2 border-gray-300 rounded-full shrink-0"></span>
                        )}
                        <span className="font-semibold text-gray-700 text-base">
                          {variationName}
                        </span>
                        {selectionCount > 0 && (
                          <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            {selectionCount} selected
                          </span>
                        )}
                      </div>
                      <span className="text-gray-400 shrink-0">
                        {isCatExpanded ? (
                          <DynamicChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <DynamicChevronDownIcon className="h-5 w-5" />
                        )}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isCatExpanded && (
                        <motion.div
                          key={`${categoryKey}-content`}
                          initial="collapsed"
                          animate="open"
                          exit="collapsed"
                          variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 },
                          }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-gray-200"
                        >
                          <div className="p-3 space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
                            {variationItem.values &&
                            variationItem.values.length > 0 ? (
                              variationItem.values.map((valueItem) => {
                                if (!valueItem) return null;
                                const valueKey =
                                  valueItem.id || valueItem.value;
                                return (
                                  <label
                                    key={valueKey}
                                    className="flex items-center space-x-2.5 p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={
                                        selectedValues[variationName]?.includes(
                                          String(valueItem.value)
                                        ) ?? false
                                      }
                                      onChange={() =>
                                        handleSelectValue(
                                          variationName,
                                          String(valueItem.value)
                                        )
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-gray-700 select-none text-sm">
                                      {valueItem.value}
                                    </span>
                                  </label>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-400 px-1.5 py-2">
                                No values defined.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {(!variationList || variationList.length === 0) &&
                hasVariationsEnabled && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-6 px-4 border border-dashed border-gray-300 rounded-lg bg-white">
                    <p className="text-sm text-gray-500">
                      No variation types defined.
                    </p>
                  </div>
                )}
            </div>

            <AnimatePresence mode="wait">
              {rows.length > 0 ? (
                <motion.div
                  key="variation-table"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-x-auto shadow rounded-lg border border-gray-200 bg-white"
                >
                  <table className="min-w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-100 border-b border-gray-200 text-xs text-gray-700 uppercase tracking-wider">
                      <tr>
                        {tableHeaders.map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-4 py-2 font-semibold"
                          >
                            {header}
                          </th>
                        ))}
                        <th
                          scope="col"
                          className="px-4 py-2 font-semibold w-40"
                        >
                          Image
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2 font-semibold w-28"
                        >
                          SKU
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2 font-semibold w-24"
                        >
                          Price
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2 font-semibold w-20"
                        >
                          Qty
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-2 font-semibold w-16 text-center"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <motion.tbody layout className="divide-y divide-gray-200">
                      <AnimatePresence initial={false}>
                        {rows.map((row, index) => (
                          <motion.tr
                            key={row.uiKey} // CRITICAL: Use uiKey for React's reconciliation
                            layout
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className={`${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50/70"
                            } hover:bg-indigo-50/50 transition-colors duration-100`}
                          >
                            {tableHeaders.map((header) => (
                              <td
                                key={`${row.uiKey}-${header}`}
                                className="px-4 py-2 whitespace-nowrap font-medium text-gray-800"
                              >
                                {row.variationValues?.[header] ?? "N/A"}
                              </td>
                            ))}
                            <td className="px-4 py-2 align-middle">
                              <FileInput
                                multipleSelect={false}
                                label=""
                                defaultValue={row.image} // Prefer URL for display, fallback to ID for FileInput
                                onImageSelect={(selectedImages) =>
                                  handleImageChange(selectedImages, row.uiKey)
                                }
                                showLabel={false}
                                imagePreviewClassName="h-12 w-12 rounded-md object-cover border border-gray-200"
                                placeholderIconSize="h-6 w-6"
                                buttonClassName="p-0 m-0"
                                containerClassName="w-full"
                              />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <input
                                type="text"
                                placeholder="SKU"
                                aria-label={`SKU for ${row.uiKey}`}
                                value={row.sku ?? ""}
                                onChange={(e) =>
                                  handleInputChange(e, row.uiKey, "sku")
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <input
                                type="number"
                                placeholder="0.00"
                                aria-label={`Price for ${row.uiKey}`}
                                step="0.01"
                                min="0"
                                value={row.price ?? ""}
                                onChange={(e) =>
                                  handleInputChange(e, row.uiKey, "price")
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <input
                                type="number"
                                placeholder="0"
                                aria-label={`Quantity for ${row.uiKey}`}
                                step="1"
                                min="0"
                                value={row.qty ?? ""}
                                onChange={(e) =>
                                  handleInputChange(e, row.uiKey, "qty")
                                }
                                className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>
                            <td className="px-4 py-2 align-middle text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.uiKey)}
                                className="text-gray-400 hover:text-red-600 p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                aria-label={`Delete ${row.uiKey}`}
                              >
                                <DynamicTrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </motion.tbody>
                  </table>
                </motion.div>
              ) : (
                hasVariationsEnabled &&
                isSectionExpanded &&
                (Object.keys(selectedValues).length > 0 ? (
                  <motion.div
                    key="no-combos-placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-8 px-4 border border-dashed border-gray-300 rounded-lg bg-white"
                  >
                    <DynamicXCircleIcon className="mx-auto h-10 w-10 text-amber-400 mb-2" />
                    <h3 className="text-base font-medium text-gray-600">
                      No combinations generated.
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Check selections.
                    </p>
                  </motion.div>
                ) : (
                  variationList &&
                  variationList.length > 0 && (
                    <motion.div
                      key="select-options-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 px-4 border border-dashed border-gray-300 rounded-lg bg-white"
                    >
                      <DynamicPhotoIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <h3 className="text-base font-medium text-gray-600">
                        Select variation options
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Choose values to generate variations.
                      </p>
                    </motion.div>
                  )
                ))
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        name={name}
        type="hidden"
        value={
          rows.length > 0
            ? JSON.stringify(
                rows.map((row) => ({
                  // Transform row to the format expected by the backend server action
                  id: row.uiKey, // The backend expects the composite ID here
                  dbId: row.dbId, // Pass dbId for backend to know if it's existing
                  combination: row.combination,
                  matcherId: row.matcherId,
                  sku: row.sku,
                  price: row.price,
                  qty: row.qty,
                  image: row.image?.id || null, // Send only the image ID, as backend expects
                  // variationValues is not typically sent, backend derives from combination
                }))
              )
            : ""
        }
        readOnly
      />
    </div>
  );
}
