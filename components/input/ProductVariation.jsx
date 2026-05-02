"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import FloatingInput from "./FloatingInput";

// --- Dynamically import Components & Icons ---
const FileInput = dynamic(() => import("./FileInput"), {
  // Make sure this path is correct
  ssr: false,
  loading: () => (
    <span className="h-12 w-12 block animate-pulse bg-gray-200 rounded-md"></span>
  ),
});

const loadingIconFallback = (className = "h-5 w-5") => (
  <span
    className={`${className} inline-block bg-gray-300 rounded-sm animate-pulse`}
  ></span>
);
const DynamicChevronDownIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.ChevronDownIcon),
  { loading: () => loadingIconFallback("h-5 w-5") },
);
const DynamicChevronUpIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.ChevronUpIcon),
  { loading: () => loadingIconFallback("h-5 w-5") },
);
const DynamicCheckCircleIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.CheckCircleIcon),
  { loading: () => loadingIconFallback("h-5 w-5") },
);
const DynamicTrashIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.TrashIcon),
  { loading: () => loadingIconFallback("h-4 w-4") },
);
const DynamicPhotoIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.PhotoIcon),
  { loading: () => loadingIconFallback("h-6 w-6") },
); // Adjusted size
const DynamicXCircleIcon = dynamic(
  () => import("@heroicons/react/24/solid").then((mod) => mod.XCircleIcon),
  { loading: () => loadingIconFallback("h-4 w-4") },
);
// --- ---

// --- generateCombinations function (as provided, assuming it's correct) ---
const generateCombinations = (processedSelections) => {
  if (!processedSelections || processedSelections.length === 0) return [];
  const sortedProcessedSelections = [...processedSelections].sort(
    ([varAObj], [varBObj]) => varAObj.name.localeCompare(varBObj.name),
  );

  return sortedProcessedSelections.reduce(
    (acc, [variationObj, valueObjects]) => {
      const sortedValueObjects = Array.isArray(valueObjects)
        ? [...valueObjects].sort((a, b) =>
            String(a.value).localeCompare(String(b.value)),
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
    },
    [],
  );
};
// --- ---

const ProductVariationInput = React.memo(function ProductVariationInput({
  colSpan = "full",
  variationList = [], // from category variationList size,color etc
  initialHasVariations = false,
  initialCombinations = [],
  name = "productVariation",
}) {
  // --- ALL HOOKS AT THE TOP ---
  const derivedInitialEnabled = useMemo(
    () =>
      initialCombinations &&
      initialCombinations[0]?.combinations &&
      initialCombinations[0].combinations?.length > 0,
    [initialCombinations],
  );

  const [hasVariationsEnabled, setHasVariationsEnabled] = useState(
    derivedInitialEnabled,
  );

  const [isSectionExpanded, setIsSectionExpanded] = useState(
    derivedInitialEnabled || false,
  );
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [rows, setRows] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);

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

  const generateUiKey = useCallback((combination) => {
    if (!combination || !Array.isArray(combination) || combination.length === 0)
      return "";
    const validComboItems = combination.filter(
      (c) =>
        c &&
        c.variation &&
        c.variation.name &&
        c.value &&
        c.value.value !== undefined,
    );
    if (validComboItems.length !== combination.length) {
      return "";
    }
    const sortedCombo = [...validComboItems].sort((a, b) =>
      a.variation.name.localeCompare(b.variation.name),
    );
    return sortedCombo
      .map((c) => `${c.variation.name}:${c.value.value}`)
      .join("|");
  }, []);

  const tableHeaders = useMemo(() => {
    if (!hasVariationsEnabled) return [];
    return Object.keys(selectedValues)
      .filter((key) => selectedValues[key] && selectedValues[key].length > 0)
      .sort();
  }, [hasVariationsEnabled, selectedValues]);

  const hiddenInputValue = useMemo(() => {
    if (!hasVariationsEnabled || rows.length === 0) return "";
    return JSON.stringify(
      rows.map((row) => ({
        uiKey: row.uiKey,
        id: row.dbId,
        combination: row.combination,
        matcherId: row.matcherId,
        sku: row.sku,
        regularPrice: row.regularPrice, // MODIFIED
        discountPrice: row.discountPrice, // MODIFIED
        weight: row.weight,
        dimensions: row.dimensions,
        qty: row.qty,
        image: row.image ? row.image.id : null,
      })),
    );
  }, [hasVariationsEnabled, rows]);

  // --- EFFECT 1: Initialize from `initialCombinations` ---
  useEffect(() => {
    if (isInitialized || !variationListMap || variationListMap.size === 0) {
      if (
        !isInitialized &&
        derivedInitialEnabled &&
        (!initialCombinations || initialCombinations.length === 0) &&
        variationListMap.size > 0
      ) {
        setIsInitialized(true);
      }
      return;
    }

    if (
      !derivedInitialEnabled ||
      !initialCombinations ||
      initialCombinations.length === 0
    ) {
      setIsInitialized(true);
      return;
    }

    const tempInitialRows = [];
    const derivedSelected = {};
    const derivedExpanded = {};

    initialCombinations.forEach((initRow) => {
      const combinationArray = Array.isArray(initRow.combination)
        ? initRow.combination
        : [];
      const validCombination = combinationArray.filter(
        (c) => c?.variation?.name && c?.value?.value !== undefined,
      );

      const uiKey = generateUiKey(validCombination);
      if (!uiKey) {
        return;
      }

      validCombination.forEach(({ variation, value }) => {
        const varName = variation.name;
        const valStr = String(value.value);
        if (!derivedSelected[varName]) derivedSelected[varName] = new Set();
        derivedSelected[varName].add(valStr);
        derivedExpanded[varName] = true;
      });
      tempInitialRows.push({
        uiKey,
        dbId: initRow.id,
        combination: validCombination,
        variationValues: validCombination.reduce((acc, c) => {
          acc[c.variation.name] = String(c.value.value);
          return acc;
        }, {}),
        matcherId:
          initRow.matcherId ||
          validCombination
            .map((c) => String(c.value.value).toLowerCase().replace(/\s+/g, ""))
            .sort()
            .join("-"),
        sku: initRow.sku || "",
        // MODIFIED: From price to regularPrice and discountPrice
        regularPrice:
          initRow.regularPrice !== undefined && initRow.regularPrice !== null
            ? String(initRow.regularPrice)
            : "",
        discountPrice:
          initRow.discountPrice !== undefined && initRow.discountPrice !== null
            ? String(initRow.discountPrice)
            : "",
        qty:
          initRow.qty !== undefined && initRow.qty !== null
            ? String(initRow.qty)
            : "",
        weight:
          initRow.weight !== undefined && initRow.weight !== null
            ? String(initRow.weight)
            : "",
        dimensions:
          initRow.dimensions !== undefined && initRow.dimensions !== null
            ? String(initRow.dimensions)
            : "",
        image: initRow.image || null,
        imageUrl: initRow.imageUrl || initRow.image?.url || null,
      });
    });

    Object.keys(derivedSelected).forEach((key) => {
      derivedSelected[key] = Array.from(derivedSelected[key]).sort();
    });

    setRows(tempInitialRows);
    setSelectedValues(derivedSelected);
    setExpandedCategories(derivedExpanded);
    if (!hasVariationsEnabled && tempInitialRows.length > 0)
      setHasVariationsEnabled(true);
    if (!isSectionExpanded && tempInitialRows.length > 0)
      setIsSectionExpanded(true);
    setIsInitialized(true);
  }, [
    initialCombinations,
    variationListMap,
    derivedInitialEnabled,
    generateUiKey,
    isInitialized,
    hasVariationsEnabled,
    isSectionExpanded,
  ]);

  // EFFECT: Clear state when variations are disabled
  useEffect(() => {
    if (!hasVariationsEnabled && isInitialized) {
      setRows([]);
      setSelectedValues({});
      setExpandedCategories({});
    }
  }, [hasVariationsEnabled, isInitialized]);

  // EFFECT 2: Generate/update table rows based on selectedValues changes
  useEffect(() => {
    if (
      !hasVariationsEnabled ||
      !isInitialized ||
      !variationListMap ||
      variationListMap.size === 0
    ) {
      return;
    }

    const hasAnyActualSelection = Object.values(selectedValues).some(
      (arr) => arr && arr.length > 0,
    );
    if (!hasAnyActualSelection) {
      if (rows.length > 0) setRows([]);
      return;
    }

    const processedSelections = Object.entries(selectedValues)
      .filter(([_, valueStrings]) => valueStrings && valueStrings.length > 0)
      .map(([variationName, selectedValueStrings]) => {
        const variationItem = variationListMap.get(variationName);
        if (!variationItem?.variation || !Array.isArray(variationItem.values))
          return null;
        const valueMap = new Map(
          variationItem.values.map((v) => [String(v.value), v]),
        );
        const selectedValueObjects = selectedValueStrings
          .map((s) => valueMap.get(s))
          .filter(Boolean);
        if (selectedValueObjects.length === 0) return null;
        return [variationItem.variation, selectedValueObjects];
      })
      .filter(Boolean);

    if (processedSelections.length === 0) {
      if (hasAnyActualSelection && rows.length > 0) setRows([]);
      return;
    }

    const generatedCombinationsFromSelection =
      generateCombinations(processedSelections);

    const newRowsData = generatedCombinationsFromSelection
      .map((combo) => {
        const uiKey = generateUiKey(combo);
        if (!uiKey) return null;
        const variationValues = combo.reduce((acc, c) => {
          acc[c.variation.name] = String(c.value.value);
          return acc;
        }, {});
        const matcherId = combo
          .map((c) => String(c.value.value).toLowerCase().replace(/\s+/g, ""))
          .sort()
          .join("-");
        return {
          uiKey,
          dbId: null,
          combination: combo,
          variationValues,
          matcherId,
          sku: "",
          regularPrice: "", // MODIFIED
          discountPrice: "", // MODIFIED
          qty: "",
          weight: "",
          dimensions: "",
          image: null,
          imageUrl: null,
        };
      })
      .filter(Boolean);

    setRows((prevRows) => {
      const prevRowsMap = new Map(prevRows.map((row) => [row.uiKey, row]));
      return newRowsData.map((newRowFromUI) => {
        const existingRowFromPrevState = prevRowsMap.get(newRowFromUI.uiKey);
        if (existingRowFromPrevState) {
          return {
            ...newRowFromUI,
            dbId: existingRowFromPrevState.dbId,
            sku: existingRowFromPrevState.sku,
            regularPrice: existingRowFromPrevState.regularPrice, // MODIFIED
            discountPrice: existingRowFromPrevState.discountPrice, // MODIFIED
            qty: existingRowFromPrevState.qty,
            weight: existingRowFromPrevState.weight,
            dimensions: existingRowFromPrevState.dimensions,
            image: existingRowFromPrevState.image,
            imageUrl: existingRowFromPrevState.imageUrl,
          };
        }
        return newRowFromUI;
      });
    });
  }, [
    selectedValues,
    hasVariationsEnabled,
    isInitialized,
    variationListMap,
    generateUiKey,
    rows.length,
  ]);

  // --- UI Handlers (useCallback) ---
  const handleToggleVariations = useCallback(
    (event) => {
      const isEnabled = event.target.checked;
      setHasVariationsEnabled(isEnabled);
      if (isEnabled) {
        setIsSectionExpanded(true);
        if (!isInitialized) setIsInitialized(true);
      } else {
        setIsSectionExpanded(false);
      }
    },
    [isInitialized],
  );

  const toggleSectionExpand = useCallback(() => {
    if (hasVariationsEnabled) setIsSectionExpanded((prev) => !prev);
  }, [hasVariationsEnabled]);

  const toggleCategoryExpand = useCallback((variationName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [variationName]: !prev[variationName],
    }));
  }, []);

  const handleSelectValue = useCallback((variationName, valueString) => {
    setSelectedValues((prev) => {
      const currentValues = prev[variationName] || [];
      const alreadySelected = currentValues.includes(valueString);
      let updatedVariationValues;
      if (alreadySelected)
        updatedVariationValues = currentValues.filter((v) => v !== valueString);
      else updatedVariationValues = [...currentValues, valueString].sort();
      const nextState = { ...prev };
      if (updatedVariationValues.length === 0) delete nextState[variationName];
      else nextState[variationName] = updatedVariationValues;
      return nextState;
    });
  }, []);

  const handleDeleteRow = useCallback(
    (uiKeyToDelete) => {
      const remainingRows = rows.filter((row) => row.uiKey !== uiKeyToDelete);
      setRows(remainingRows);
      setSelectedValues((prevSelected) => {
        const nextSelected = {};
        if (remainingRows.length > 0) {
          remainingRows.forEach((row) => {
            if (Array.isArray(row.combination)) {
              row.combination.forEach(({ variation, value }) => {
                if (variation?.name && value?.value !== undefined) {
                  const varName = variation.name;
                  const valStr = String(value.value);
                  if (!nextSelected[varName]) nextSelected[varName] = new Set();
                  nextSelected[varName].add(valStr);
                }
              });
            }
          });
          Object.keys(nextSelected).forEach((key) => {
            nextSelected[key] = Array.from(nextSelected[key]).sort();
          });
        }
        if (JSON.stringify(prevSelected) !== JSON.stringify(nextSelected)) {
          return nextSelected;
        }
        return prevSelected;
      });
    },
    [rows],
  );

  const handleImageChange = useCallback((selectedImages, rowUiKey) => {
    const imageFile =
      selectedImages && selectedImages.length > 0 ? selectedImages[0] : null;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.uiKey === rowUiKey
          ? {
              ...row,
              image: imageFile
                ? { id: imageFile.id, name: imageFile.name, url: imageFile.url }
                : null,
              imageUrl: imageFile?.url || null,
            }
          : row,
      ),
    );
  }, []);

  const handleInputChange = useCallback((e, rowUiKey, field) => {
    const { value } = e.target;
    setRows((prevRows) =>
      prevRows.map((row) =>
        row.uiKey === rowUiKey ? { ...row, [field]: value } : row,
      ),
    );
  }, []);

  // --- Conditional Rendering for Loading State ---
  if (
    hasVariationsEnabled &&
    !isInitialized &&
    variationListMap.size > 0 &&
    initialCombinations &&
    initialCombinations.length > 0
  ) {
    return (
      <div
        className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan} text-center`}
      >
        <div className="animate-pulse mt-4 space-y-3">
          <div className="h-10 bg-gray-200 rounded w-full mx-auto"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-20 bg-gray-200 rounded w-full mx-auto"></div>
        </div>
      </div>
    );
  }
  if (hasVariationsEnabled && !isInitialized && variationListMap.size === 0) {
    return (
      <div
        className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan} text-center`}
      >
        <p>Loading variation definitions...</p>
      </div>
    );
  }

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

  // --- JSX Render ---
  return (
    <div className={` bg-gray-50 shadow-lg rounded-xl col-span-${colSpan}`}>
      {/* Header with Toggle */}

      <div className="flex  justify-between items-center mb-4 border-b-2 border-gray-200 p-2 bg-slate-100">
        <span className="text-md font-bold">Product Price & Variations</span>
        <label className="flex items-center space-x-2 cursor-pointer shrink-0 pl-4">
          <input
            type="checkbox"
            defaultChecked={hasVariationsEnabled}
            onChange={handleToggleVariations}
            className="h-4 w-4 rounded border-gray-300 cursor-pointer text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className=" font-medium text-gray-700">Has Variations</span>
        </label>
      </div>

      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
        {!!hasVariationsEnabled ? (
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
            <h2 className="text-base font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors duration-150">
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
        ) : (
          //// Product Price
          <div className="w-full">
            <h2 className="text-[10px] md:text-base font-semibold text-gray-800">
              Product Price
            </h2>
            <div className="grid md:grid-cols-7 gap-2 ">
              <FloatingInput
                defaultValue={
                  derivedInitialEnabled
                    ? ""
                    : initialCombinations[0]?.regularPrice
                }
                name="regularPrice"
                label="Regualar Price"
                required
              />
              <FloatingInput
                defaultValue={
                  derivedInitialEnabled
                    ? ""
                    : initialCombinations[0]?.discountPrice
                }
                name="discountPrice"
                label="Discount Price"
              />
              <FloatingInput
                defaultValue={
                  derivedInitialEnabled ? "" : initialCombinations[0]?.stock
                }
                name="stock"
                label="Quantity"
              />

              <FloatingInput
                defaultValue={
                  derivedInitialEnabled ? "" : initialCombinations[0]?.weight
                }
                name="weight"
                label="weight (kg)"
                required
              />
              <FloatingInput
                defaultValue={
                  derivedInitialEnabled
                    ? ""
                    : initialCombinations[0]?.dimensions
                }
                label="Pakage dimensions (L×W×H cm)"
                name="dimensions"
                required
                colSpan={2}
              />
              <FloatingInput
                defaultValue={
                  derivedInitialEnabled ? "" : initialCombinations[0]?.sku
                }
                name="sku"
                label="sku"
                disabled
              />
            </div>
          </div>
        )}
      </div>

      {/* Variation Content Area */}

      <div className="max-w-screen">
        <AnimatePresence initial={false}>
          {hasVariationsEnabled && isSectionExpanded && (
            <motion.div
              id="variation-content-area"
              key="variation-content"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={sectionVariants}
            >
              {/* Variation Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {variationList && variationList.length > 0 ? (
                  variationList.map((variationItem) => {
                    if (!variationItem?.variation?.name) return null;
                    const variationName = variationItem.variation.name;
                    const isCatExpanded = !!expandedCategories[variationName];
                    const selectionCount =
                      selectedValues[variationName]?.length ?? 0;
                    const categoryKey =
                      variationItem.variation.id || variationName;
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
                                            selectedValues[
                                              variationName
                                            ]?.includes(
                                              String(valueItem.value),
                                            ) ?? false
                                          }
                                          onChange={() =>
                                            handleSelectValue(
                                              variationName,
                                              String(valueItem.value),
                                            )
                                          }
                                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                        />
                                        <span className="text-gray-700 select-none ">
                                          {valueItem.value}
                                        </span>
                                      </label>
                                    );
                                  })
                                ) : (
                                  <p className="text-xs text-gray-400 px-1.5 py-2">
                                    | No values defined.
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-6 px-2 border border-dashed border-gray-300 rounded-lg bg-white">
                    <p className=" text-gray-500">
                      No variation types (attributes) have been defined for this
                      product yet. Configure them in settings.
                    </p>
                  </div>
                )}
              </div>

              {/* Variation Table Area */}
              <AnimatePresence mode="wait">
                {rows.length > 0 ? (
                  <motion.div
                    key="variation-table"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className=" shadow rounded-lg border border-gray-200 "
                  >
                    <div className="md:w-full max-w-[calc(100vw-20px)] overflow-x-auto ">
                      <table className="  text-left text-gray-600  w-full ">
                        <thead
                          className="
                      bg-gray-100 border-b border-gray-200  text-gray-700 uppercase tracking-wider"
                        >
                          <tr>
                            {tableHeaders.map((header) => (
                              <th
                                key={header}
                                scope="col"
                                className="px-2 py-2 font-semibold"
                              >
                                {header}
                              </th>
                            ))}
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold w-28 "
                            >
                              Image
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold "
                            >
                              SKU
                            </th>
                            {/* MODIFIED: Table Headers */}
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold "
                            >
                              Regular Price
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold "
                            >
                              Discount Price
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold "
                            >
                              Qty
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold w-4"
                            >
                              Weight (KG)
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold w-8"
                            >
                              Pakage dimensions (L×W×H cm)
                            </th>
                            <th
                              scope="col"
                              className="px-2 py-2 font-semibold w-16 text-center"
                            >
                              Action
                            </th>
                          </tr>
                        </thead>
                        <motion.tbody
                          layout
                          className="divide-y divide-gray-200"
                        >
                          <AnimatePresence initial={false}>
                            {rows.map((row, index) => (
                              <motion.tr
                                key={row.uiKey}
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
                                    className="px-2 py-2  font-medium text-gray-800"
                                  >
                                    {row.variationValues?.[header] ?? (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                ))}
                                <td className="">
                                  <FileInput
                                    multipleSelect={false}
                                    defaultValue={row.image}
                                    onImageSelect={(selectedImages) =>
                                      handleImageChange(
                                        selectedImages,
                                        row.uiKey,
                                      )
                                    }
                                    showLabel={false}
                                    w="50"
                                    h="50"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle ">
                                  <input
                                    disabled
                                    type="text"
                                    placeholder="SKU"
                                    aria-label={`SKU for ${row.uiKey}`}
                                    value={row.sku ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(e, row.uiKey, "sku")
                                    }
                                    className=" px-2 w-20 py-1.5 border border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                </td>

                                <td className="px-2 py-2 align-middle ">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    aria-label={`Regular Price for ${row.uiKey}`}
                                    step="0.01"
                                    min="0"
                                    value={row.regularPrice ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        e,
                                        row.uiKey,
                                        "regularPrice",
                                      )
                                    }
                                    className=" px-2 py-1.5 w-16 border border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    aria-label={`Discount Price for ${row.uiKey}`}
                                    step="0.01"
                                    min="0"
                                    value={row.discountPrice ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        e,
                                        row.uiKey,
                                        "discountPrice",
                                      )
                                    }
                                    className="px-2 py-1.5 border w-16 border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
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
                                    className=" px-2 py-1.5 border w-16 border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="number"
                                    placeholder="0"
                                    aria-label={`Weight for ${row.uiKey}`}
                                    min="0"
                                    step="0.01"
                                    value={row.weight ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(e, row.uiKey, "weight")
                                    }
                                    className=" px-2 py-1.5 border w-16 border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle">
                                  <input
                                    type="text"
                                    aria-label={`Dimention for ${row.uiKey}`}
                                    placeholder={"100X50X30"}
                                    value={row.dimensions ?? ""}
                                    onChange={(e) =>
                                      handleInputChange(
                                        e,
                                        row.uiKey,
                                        "dimensions",
                                      )
                                    }
                                    className=" px-2 py-1.5 w-32 border border-gray-300 rounded-md shadow-sm  focus:ring-indigo-500 focus:border-indigo-500 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </td>
                                <td className="px-2 py-2 align-middle text-center">
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
                    </div>
                  </motion.div>
                ) : (
                  /* Placeholders for no rows */
                  hasVariationsEnabled &&
                  isSectionExpanded &&
                  (Object.keys(selectedValues).length > 0 &&
                  Object.values(selectedValues).some(
                    (arr) => arr && arr.length > 0,
                  ) ? (
                    <motion.div
                      key="no-combos-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 px-2 border border-dashed border-gray-300 rounded-lg bg-white"
                    >
                      <DynamicXCircleIcon className="mx-auto h-10 w-10 text-amber-400 mb-2" />
                      <h3 className="text-base font-medium text-gray-600">
                        No combinations generated.
                      </h3>
                      <p className=" text-gray-500 mt-1">
                        Review your selections or variation definitions.
                      </p>
                    </motion.div>
                  ) : variationList && variationList.length > 0 ? (
                    <motion.div
                      key="select-options-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 px-2 border border-dashed border-gray-300 rounded-lg bg-white"
                    >
                      <DynamicPhotoIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <h3 className="text-base font-medium text-gray-600">
                        Select variation options
                      </h3>
                      <p className=" text-gray-500 mt-1">
                        Choose values to generate specific product variations.
                      </p>
                    </motion.div>
                  ) : !isInitialized && variationListMap.size === 0 ? null : (
                    <motion.div
                      key="no-variation-types-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 px-2 border border-dashed border-gray-300 rounded-lg bg-white"
                    >
                      <DynamicXCircleIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                      <h3 className="text-base font-medium text-gray-600">
                        No Variation Types Defined.
                      </h3>
                      <p className=" text-gray-500 mt-1">
                        Please configure variation attributes (like Color, Size)
                        in your product settings first.
                      </p>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <input name={name} type="hidden" value={hiddenInputValue} readOnly />
    </div>
  );
});

export default ProductVariationInput;
