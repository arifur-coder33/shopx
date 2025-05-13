"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

// --- Dynamically import Components & Icons ---
const FileInput = dynamic(() => import("./FileInput"), {
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

// --- generateCombinations function ---
const generateCombinations = (processedSelections) => {
  // ... (generateCombinations function remains the same)
  if (!processedSelections || processedSelections.length === 0) return [];

  // Sort variations by name first for consistent processing order
  processedSelections.sort(([varAObj], [varBObj]) =>
    varAObj.name.localeCompare(varBObj.name)
  );

  return processedSelections.reduce((acc, [variationObj, valueObjects]) => {
    // Ensure values are sorted (important for consistent output if order matters)
    const sortedValueObjects = Array.isArray(valueObjects)
      ? [...valueObjects].sort((a, b) =>
          String(a.value).localeCompare(String(b.value))
        )
      : [];

    // If accumulator is empty, initialize with the first set of values
    if (acc.length === 0) {
      return sortedValueObjects.map((valueObj) => [
        { variation: variationObj, value: valueObj },
      ]);
    }

    // Otherwise, combine existing combinations with new values
    const newAcc = [];
    acc.forEach((combo) => {
      sortedValueObjects.forEach((valueObj) => {
        newAcc.push([...combo, { variation: variationObj, value: valueObj }]);
      });
    });
    return newAcc;
  }, []); // Start with an empty array
};
// --- ---

// --- Component Definition ---
export default function ProductVariationInput({
  colSpan = "full",
  variationList,
  initialHasVariations = false, // Hint, but initialCombinations takes precedence
  initialCombinations = [], // <-- Receive initial row data here (Array of RowData objects)
  name, // Name for the hidden input submitting the final data
}) {
  // Determine initial enabled state based on prop OR presence of initial combinations

  const derivedInitialEnabled =
    initialHasVariations ||
    (initialCombinations && initialCombinations.length > 0);

  const [hasVariationsEnabled, setHasVariationsEnabled] = useState(
    derivedInitialEnabled
  );
  const [isSectionExpanded, setIsSectionExpanded] = useState(
    derivedInitialEnabled // Expand if initially enabled
  );
  const [expandedCategories, setExpandedCategories] = useState({});
  const [selectedValues, setSelectedValues] = useState({});
  const [rows, setRows] = useState([]); // Initialize as empty, populated by effect
  const [isInitialized, setIsInitialized] = useState(false); // Flag for initial data load

  // --- Effect for Initial Data Loading ---
  useEffect(() => {
    // Run only once if initialCombinations are provided and we haven't initialized yet
    if (
      initialCombinations &&
      initialCombinations.length > 0 &&
      !isInitialized &&
      rows.length === 0 // Guard against race conditions
    ) {
      console.log("Initializing component state from initialCombinations...");

      // --- Data Validation (Recommended) ---
      // Add checks here to ensure initialCombinations have the expected structure
      // e.g., check if it's an array, if objects have 'id', 'combination', etc.
      // Example:
      // if (!Array.isArray(initialCombinations) || initialCombinations.some(row => typeof row.id !== 'string' || !Array.isArray(row.combination))) {
      //   console.error("Invalid initialCombinations structure received:", initialCombinations);
      //   setIsInitialized(true); // Mark as initialized to prevent retries with bad data
      //   return; // Stop processing
      // }

      // 1. Set Rows state directly from the prop
      setRows(initialCombinations);

      // 2. Derive Selected Values state from initialCombinations
      const derivedSelectedValues = {};
      initialCombinations.forEach((row) => {
        if (Array.isArray(row.combination)) {
          row.combination.forEach(({ variation, value }) => {
            // Check for valid variation and value structure
            if (variation?.name && value?.value !== undefined) {
              const varName = variation.name;
              const valStr = String(value.value); // Ensure value is treated as a string key
              if (!derivedSelectedValues[varName]) {
                derivedSelectedValues[varName] = new Set();
              }
              derivedSelectedValues[varName].add(valStr);
            } else {
              console.warn(
                "Skipping invalid combination part in initial data for row:",
                row.id,
                { variation, value }
              );
            }
          });
        } else {
          console.warn(
            "Row has invalid 'combination' structure in initial data:",
            row
          );
        }
      });

      // Convert Sets in derivedSelectedValues to sorted arrays
      Object.keys(derivedSelectedValues).forEach((key) => {
        derivedSelectedValues[key] = Array.from(
          derivedSelectedValues[key]
        ).sort();
      });
      setSelectedValues(derivedSelectedValues);

      // 3. Ensure Variations are Enabled and Section is Expanded
      // (These are likely already set correctly by derivedInitialEnabled, but this ensures consistency)
      if (!hasVariationsEnabled) setHasVariationsEnabled(true);
      if (!isSectionExpanded) setIsSectionExpanded(true);

      // 4. Expand Variation Categories that have initial selections (Good UX)
      const derivedExpandedCategories = {};
      Object.keys(derivedSelectedValues).forEach((key) => {
        derivedExpandedCategories[key] = true; // Mark categories with selections as expanded
      });
      setExpandedCategories(derivedExpandedCategories);

      // 5. Mark as initialized to prevent this effect from re-running
      setIsInitialized(true);
      console.log("Initialization complete.");
    }

    // Dependencies for this effect:
    // - initialCombinations: The data source.
    // - isInitialized: The flag preventing re-runs.
    // - rows.length: Guard to prevent resetting rows if they were set some other way before this ran.
  }, [initialCombinations, isInitialized, rows.length]);

  // Effect to clear state when variations are disabled *after* initialization
  useEffect(() => {
    // Only act if variations are disabled AND the component was already initialized
    if (!hasVariationsEnabled && isInitialized) {
      console.log("Variations disabled, clearing related state...");
      // Clear rows if they exist
      if (rows.length > 0) setRows([]);
      // Clear selected values if they exist
      if (Object.keys(selectedValues).length > 0) setSelectedValues({});
      // Collapse individual variation categories if they are expanded
      if (Object.keys(expandedCategories).length > 0) setExpandedCategories({});
      // Collapse the main section
      if (isSectionExpanded) setIsSectionExpanded(false);

      // Optional: Reset initialization flag if disabling should allow re-initialization
      // This might be needed if `initialCombinations` could change and you want to reload
      // if the user toggles variations off and then on again.
      // setIsInitialized(false);
    }
    // Dependencies: Run when the enabled status changes or the initialized status changes.
  }, [hasVariationsEnabled, isInitialized]); // Removed state setters from dependency array

  // --- Callbacks and Memoized Values ---

  // Toggle expansion state of individual variation categories (like Color, Size)
  const toggleCategoryExpand = (variationName) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [variationName]: !prev[variationName], // Toggle the boolean value
    }));
  };

  // Handle selecting/deselecting a specific variation value (e.g., Red, Large)
  const handleSelectValue = useCallback(
    (variationName, valueString) => {
      setSelectedValues((prev) => {
        const currentValues = prev[variationName] || []; // Get current selections for this variation, or empty array
        const alreadySelected = currentValues.includes(valueString);
        let updatedVariationValues;

        if (alreadySelected) {
          // Filter out the deselected value
          updatedVariationValues = currentValues.filter(
            (v) => v !== valueString
          );
        } else {
          // Add the new value and sort the array
          updatedVariationValues = [...currentValues, valueString].sort();
        }

        // Create the next state object
        const nextState = { ...prev };
        if (updatedVariationValues.length === 0) {
          // If no values remain selected for this variation, remove the key entirely
          delete nextState[variationName];
        } else {
          // Otherwise, update the key with the new array of selected values
          nextState[variationName] = updatedVariationValues;
        }
        return nextState; // Return the updated state
      });

      // Any user interaction with selections implies initialization is done or bypassed
      if (!isInitialized) setIsInitialized(true);
    },
    [isInitialized] // Dependency on isInitialized flag
  );

  // Memoized map for quick lookup of full variation data (VariationListItem) by variation name
  const variationListMap = useMemo(() => {
    const map = new Map();
    if (variationList && Array.isArray(variationList)) {
      variationList.forEach((variationItem) => {
        // Ensure the item and its variation name are valid before adding to map
        if (variationItem?.variation?.name) {
          map.set(variationItem.variation.name, variationItem);
        }
      });
    }
    return map;
  }, [variationList]); // Recalculate only when variationList prop changes

  // Effect to generate/update table rows based on changes in selected values
  useEffect(() => {
    // --- Pre-conditions ---
    // Don't run if variations are disabled or if the component hasn't initialized yet
    // (initial load is handled by the first useEffect).
    if (!hasVariationsEnabled || !isInitialized) {
      // If disabled after init, ensure rows are cleared (might be redundant, but safe)
      if (!hasVariationsEnabled && rows.length > 0 && isInitialized) {
        setRows([]);
      }
      return; // Exit early
    }

    // If no variation values are selected at all, clear the rows
    if (Object.keys(selectedValues).length === 0) {
      if (rows.length > 0) setRows([]); // Clear existing rows
      return; // Exit early
    }

    // --- Process Selections ---
    // Convert selectedValues (string arrays) into the structure needed by generateCombinations
    // (which expects [VariationObject, [ValueObject, ValueObject,...]])
    const processedSelections = Object.entries(selectedValues)
      .map(([variationName, selectedValueStrings]) => {
        const variationItem = variationListMap.get(variationName); // Get full variation data
        // Validate the retrieved variation item
        if (!variationItem?.variation || !Array.isArray(variationItem.values)) {
          console.warn(
            `Variation data missing or invalid for: ${variationName}`
          );
          return null; // Skip this variation if data is incomplete
        }

        // Create a quick lookup map for value objects within this variation
        const valueMap = new Map(
          variationItem.values.map((v) => [String(v.value), v])
        );
        // Map selected value strings back to their full value objects
        const selectedValueObjects = selectedValueStrings
          .map((valueString) => valueMap.get(valueString))
          .filter(Boolean); // Filter out any potential undefined results (if data mismatch)

        // If no valid value objects were found for the selected strings, skip
        if (selectedValueObjects.length === 0) return null;

        // Return the structure expected by generateCombinations
        return [variationItem.variation, selectedValueObjects];
      })
      .filter(Boolean); // Filter out any null entries from the map operation

    // If after processing, there are no valid selections left, clear rows and exit
    if (processedSelections.length === 0) {
      if (rows.length > 0) setRows([]);
      return;
    }

    // --- Generate Combinations ---
    const generatedCombinations = generateCombinations(processedSelections);

    // --- Format New Rows ---
    const newRows = generatedCombinations.map((combo) => {
      // Sort combo parts by variation name for consistent ID/key generation
      const sortedCombo = [...combo].sort((a, b) =>
        a.variation.name.localeCompare(b.variation.name)
      );
      // Create a unique, stable ID for the row (used as React key and for merging)
      const reactKeyId = sortedCombo
        .map((c) => `${c.variation.name}:${c.value.value}`)
        .join("|");
      // Create a simple map of { VariationName: ValueString } for easy display in the table
      const variationValues = combo.reduce((acc, c) => {
        acc[c.variation.name] = String(c.value.value); // Ensure value is a string
        return acc;
      }, {});
      // Create a simplified ID for potential matching/filtering (lowercase, no spaces, sorted values)
      const matcherId = combo
        .map((c) => String(c.value.value)) // Ensure string
        .map((val) => val.toLowerCase().replace(/\s+/g, "")) // Normalize
        .sort() // Sort values alphabetically
        .join("-"); // Join with hyphen

      // Return the basic structure for a new row, default editable fields are empty/null
      return {
        id: reactKeyId,
        combination: combo, // Store the full structured combination data
        variationValues: variationValues, // For easy access in rendering table cells
        matcherId: matcherId,
        sku: "",
        price: "",
        qty: "",
        image: null, // Store image ID
        imageUrl: null, // Store image URL
      };
    });

    // --- Merge with Previous Rows ---
    // This is crucial to preserve data (SKU, price, qty, image) entered by the user
    // or loaded initially.
    setRows((prevRows) => {
      // Create a Map of the previous rows, keyed by their unique ID for fast lookups
      const prevRowsMap = new Map(prevRows.map((row) => [row.id, row]));

      // Iterate over the newly generated rows based on current selections
      return newRows.map((newRow) => {
        const existingRow = prevRowsMap.get(newRow.id); // Check if a row with this ID already exists

        // If an existing row is found, merge: use the new structure but keep the old data
        if (existingRow) {
          return {
            ...newRow, // Take the latest structural info (id, combination, variationValues, matcherId)
            sku: existingRow.sku, // Keep the existing SKU
            price: existingRow.price, // Keep the existing Price
            qty: existingRow.qty, // Keep the existing Quantity
            image: existingRow.image, // Keep the existing Image ID
            imageUrl: existingRow.imageUrl, // Keep the existing Image URL
            // Add any other fields here that should be preserved from the existingRow
          };
        } else {
          // If no existing row is found, it's a genuinely new combination, so use the newRow as is
          return newRow;
        }
      });
    });

    // Dependencies: This effect runs when selected values change, the enabled status changes (after init),
    // the variation list map changes, or the initialization status changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues, hasVariationsEnabled, variationListMap, isInitialized]); // Added isInitialized

  // Handler for the main "Has Variations" checkbox toggle
  const handleToggleVariations = (event) => {
    const isEnabled = event.target.checked;
    setHasVariationsEnabled(isEnabled); // Update the enabled state

    if (isEnabled) {
      // If enabling, expand the section
      setIsSectionExpanded(true);
      // If this is the first user interaction that enables variations, mark as initialized
      if (!isInitialized) setIsInitialized(true);
    } else {
      // If disabling, collapse the section immediately
      // The useEffect watching `hasVariationsEnabled` will handle clearing state.
      setIsSectionExpanded(false);
    }
  };

  // Handler for clicking the section title to expand/collapse (only works if enabled)
  const toggleSectionExpand = () => {
    if (hasVariationsEnabled) {
      // Only allow toggle if variations are enabled
      setIsSectionExpanded((prev) => !prev);
    }
  };

  // Handler to delete a specific row from the variations table
  const handleDeleteRow = (rowIdToDelete) => {
    // Create a new array excluding the row to be deleted
    const remainingRows = rows.filter((row) => row.id !== rowIdToDelete);
    setRows(remainingRows); // Update the rows state immediately

    // --- Recalculate selectedValues based on the *remaining* rows ---
    // This ensures the checkboxes accurately reflect the variations present in the table.
    if (remainingRows.length > 0) {
      const nextSelectedValues = {};
      remainingRows.forEach((row) => {
        // Process each part of the combination for the remaining row
        if (Array.isArray(row.combination)) {
          row.combination.forEach(({ variation, value }) => {
            if (variation?.name && value?.value !== undefined) {
              const varName = variation.name;
              const valStr = String(value.value);
              // Initialize a Set for the variation if it doesn't exist
              if (!nextSelectedValues[varName]) {
                nextSelectedValues[varName] = new Set();
              }
              // Add the value string to the Set
              nextSelectedValues[varName].add(valStr);
            }
          });
        }
      });

      // Convert Sets back to sorted arrays for the state
      Object.keys(nextSelectedValues).forEach((variationName) => {
        nextSelectedValues[variationName] = Array.from(
          nextSelectedValues[variationName]
        ).sort();
      });

      // --- Deep Compare before setting state ---
      // Avoid unnecessary re-renders if the selected values didn't actually change
      // (e.g., deleting a row that was the only one with a specific value,
      // but other variations still exist). Stringify is a simple way to deep compare.
      const currentJson = JSON.stringify(selectedValues);
      const nextJson = JSON.stringify(nextSelectedValues);
      if (currentJson !== nextJson) {
        setSelectedValues(nextSelectedValues);
      }
    } else {
      // If deleting the very last row, clear all selections
      setSelectedValues({});
    }

    // User interaction implies initialization is complete or bypassed
    if (!isInitialized) setIsInitialized(true);
  };

  // Handler for when an image is selected/changed via the FileInput component
  const handleImageChange = (selectedImages, rowId) => {
    // Assuming FileInput returns an array, take the first image (or null if empty)
    const image =
      selectedImages && selectedImages.length > 0 ? selectedImages[0] : null;
    setRows((prevRows) =>
      prevRows.map(
        (row) =>
          row.id === rowId
            ? {
                ...row,
                image: image?.id || null, // Store the image ID (or null if no image/id)
                imageUrl: image?.url || null, // Store the image URL for display (or null)
              }
            : row // Return unchanged row if ID doesn't match
      )
    );
    // User interaction implies initialization is complete or bypassed
    if (!isInitialized) setIsInitialized(true);
  };

  // Generic handler for changes in the input fields (SKU, Price, Qty) within table rows
  const handleInputChange = (e, rowId, field) => {
    const { value } = e.target; // Get the new value from the input event
    setRows((prevRows) =>
      prevRows.map((row) =>
        // Find the row by ID and update the specified field
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
    // User interaction implies initialization is complete or bypassed
    if (!isInitialized) setIsInitialized(true);
  };

  // Memoized calculation of table headers based on *currently selected* variation types
  const tableHeaders = useMemo(() => {
    // If variations aren't enabled, there are no headers for the variation part
    if (!hasVariationsEnabled) return [];

    // Derive headers dynamically from the keys of the `selectedValues` state object.
    // This ensures that columns only appear for variations that currently have
    // at least one value selected.
    return (
      Object.keys(selectedValues)
        // Optional filter: Ensure the variation actually has values selected
        // This prevents an empty column if a variation key exists but its value array is empty
        .filter((key) => selectedValues[key]?.length > 0)
        .sort()
    ); // Sort header names alphabetically for consistent column order
  }, [hasVariationsEnabled, selectedValues]); // Recalculate when enabled status or selections change

  // Animation variants (using Framer Motion)
  const rowVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }, // Slide out left on exit
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
  console.log((rows?.map(({variationValues,...rest})=>rest)))
  // --- JSX Rendering ---
  return (
    // Main container div
    <div className={`p-6 bg-gray-50 shadow-lg rounded-xl col-span-${colSpan}`}>
      {/* Header Section: Title, Toggle Button, Enable Checkbox */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
        {/* Button to toggle the main variation section (enabled only when Has Variations is checked) */}
        <button
          type="button"
          onClick={toggleSectionExpand}
          disabled={!hasVariationsEnabled} // Disable button if variations are not enabled
          className={`flex items-center space-x-2 text-left focus:outline-none group disabled:cursor-not-allowed disabled:opacity-50 ${
            hasVariationsEnabled ? "cursor-pointer" : "" // Change cursor only if enabled
          }`}
          aria-expanded={hasVariationsEnabled && isSectionExpanded} // ARIA state for accessibility
          aria-controls="variation-content-area" // Links button to the content area
        >
          <h2 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-700 transition-colors duration-150">
            Product Variations
          </h2>
          {/* Show Chevron icon only if variations are enabled */}
          {hasVariationsEnabled && (
            <span className="text-gray-500 group-hover:text-indigo-600 transition-colors duration-150 shrink-0">
              {/* Show up or down chevron based on expanded state */}
              {isSectionExpanded ? (
                <DynamicChevronUpIcon className="h-5 w-5" />
              ) : (
                <DynamicChevronDownIcon className="h-5 w-5" />
              )}
            </span>
          )}
        </button>
        {/* Checkbox to enable/disable variations */}
        <label className="flex items-center space-x-2 cursor-pointer shrink-0 pl-4">
          <input
            type="checkbox"
            checked={hasVariationsEnabled} // Controlled component: checked state from state variable
            onChange={handleToggleVariations} // Handler for checkbox change
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0"
          />
          <span className="text-sm font-medium text-gray-700">
            Has Variations
          </span>
        </label>
      </div>
      {/* Main Variation Content Area (Conditionally Rendered and Animated) */}
      <AnimatePresence initial={false}>
        {/* Don't run initial animation on mount */}
        {/* Render content only if variations are enabled AND the section is expanded */}
        {hasVariationsEnabled && isSectionExpanded && (
          <motion.div
            id="variation-content-area" // Target for aria-controls
            key="variation-content" // Stable key for AnimatePresence
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={sectionVariants} // Apply animation variants
            className="space-y-6 overflow-hidden" // Add spacing between elements inside
          >
            {/* Variations Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Map over the available variation types (like Color, Size) */}
              {variationList?.map((variationItem) => {
                // Basic validation: Ensure variation item and its name exist
                if (!variationItem?.variation?.name) return null;

                const variationName = variationItem.variation.name;
                const isCatExpanded = !!expandedCategories[variationName]; // Check if this category is expanded
                const selectionCount =
                  selectedValues[variationName]?.length ?? 0; // Count selected values for this variation

                // Unique key for the category card - use variation ID if available, otherwise name
                const categoryKey = variationItem.variation.id || variationName;

                return (
                  <div
                    key={categoryKey}
                    className="border border-gray-200 rounded-lg shadow-sm bg-white overflow-hidden"
                  >
                    {/* Button to toggle expansion of this specific variation category */}
                    <button
                      type="button"
                      onClick={() => toggleCategoryExpand(variationName)}
                      className={`flex items-center justify-between w-full p-3 text-left transition-colors duration-150 ease-in-out ${
                        isCatExpanded ? "bg-gray-100" : "hover:bg-gray-50" // Style based on expansion
                      }`}
                      aria-expanded={isCatExpanded} // ARIA state
                    >
                      {/* Left side: Icon, Name, Selection Count */}
                      <div className="flex items-center space-x-2">
                        {/* Show check circle if selected, otherwise empty circle */}
                        {selectionCount > 0 ? (
                          <DynamicCheckCircleIcon className="h-5 w-5 text-indigo-600 shrink-0" />
                        ) : (
                          <span className="h-5 w-5 block border-2 border-gray-300 rounded-full shrink-0"></span>
                        )}
                        <span className="font-semibold text-gray-700 text-base">
                          {variationName} {/* Display variation name */}
                        </span>
                        {/* Show selection count badge if > 0 */}
                        {selectionCount > 0 && (
                          <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                            {selectionCount} selected
                          </span>
                        )}
                      </div>
                      {/* Right side: Chevron icon indicating expansion state */}
                      <span className="text-gray-400 shrink-0">
                        {isCatExpanded ? (
                          <DynamicChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <DynamicChevronDownIcon className="h-5 w-5" />
                        )}
                      </span>
                    </button>
                    {/* Animatable content area for variation values */}
                    <AnimatePresence initial={false}>
                      {isCatExpanded && (
                        <motion.div
                          key={`${categoryKey}-content`} // Unique key for animation
                          initial="collapsed"
                          animate="open"
                          exit="collapsed"
                          variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 },
                          }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-gray-200" // Separator line
                        >
                          {/* Scrollable container for variation values */}
                          <div className="p-3 space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
                            {/* Check if values exist and render them */}
                            {variationItem.values &&
                            variationItem.values.length > 0 ? (
                              variationItem.values.map((valueItem) => {
                                // Ensure valueItem exists before rendering
                                if (!valueItem) return null;
                                // Unique key for value item - use ID or value itself
                                const valueKey =
                                  valueItem.id || valueItem.value;
                                return (
                                  <label
                                    key={valueKey}
                                    className="flex items-center space-x-2.5 p-1.5 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      // Check if this value string is in the selectedValues array for this variationName
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
                                      } // Use string value
                                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                                    />
                                    <span className="text-gray-700 select-none text-sm">
                                      {valueItem.value}
                                      {/* Display the value */}
                                    </span>
                                  </label>
                                );
                              })
                            ) : (
                              // Placeholder if no values are defined for this variation
                              <p className="text-xs text-gray-400 px-1.5 py-2">
                                No values defined for this variation.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              {/* Placeholder if variationList itself is empty or not provided */}
              {(!variationList || variationList.length === 0) &&
                hasVariationsEnabled && (
                  <div className="md:col-span-2 lg:col-span-3 text-center py-6 px-4 border border-dashed border-gray-300 rounded-lg bg-white">
                    <p className="text-sm text-gray-500">
                      No variation types (like Color, Size) have been defined.
                      Add them in category settings.
                    </p>
                  </div>
                )}
            </div>
            {/* End Variations Selection Grid */}
            {/* Variations Table & Placeholders Area */}
            <AnimatePresence mode="wait">
              {/* Wait for exit animations before entering new */}
              {/* Render table only if there are rows generated */}
              {
                rows.length > 0 ? (
                  <motion.div
                    key="variation-table" // Key for AnimatePresence
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-x-auto shadow rounded-lg border border-gray-200 bg-white" // Styling for table container
                  >
                    <table className="min-w-full text-sm text-left text-gray-600">
                      {/* Table Header */}
                      <thead className="bg-gray-100 border-b border-gray-200 text-xs text-gray-700 uppercase tracking-wider">
                        <tr>
                          {/* Dynamic Headers based on selected variations */}
                          {tableHeaders.map((header) => (
                            <th
                              key={header}
                              scope="col"
                              className="px-4 py-2 font-semibold"
                            >
                              {header}
                            </th>
                          ))}
                          {/* Static Headers */}
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
                      {/* Table Body - Use motion.tbody for potential layout animations */}
                      <motion.tbody layout className="divide-y divide-gray-200">
                        {/* AnimatePresence for row add/remove animations */}
                        <AnimatePresence initial={false}>
                          {rows.map((row, index) => (
                            <motion.tr
                              key={row.id} // CRITICAL: Use the stable unique ID from row data
                              layout // Enable layout animation for reordering
                              variants={rowVariants} // Apply row add/remove/reorder animations
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              // Apply alternating row background colors and hover effect
                              className={`${
                                index % 2 === 0 ? "bg-white" : "bg-gray-50/70"
                              } hover:bg-indigo-50/50 transition-colors duration-100`}
                            >
                              {/* Dynamic variation value cells */}
                              {tableHeaders.map((header) => (
                                <td
                                  key={`${row.id}-${header}`}
                                  className="px-4 py-2 whitespace-nowrap font-medium text-gray-800"
                                >
                                  {/* Access value from row.variationValues map using header name */}
                                  {row.variationValues?.[header] ?? "N/A"}
                                  {/* Handle potential missing value */}
                                </td>
                              ))}

                              {/* Image Cell with FileInput */}
                              <td className="px-4 py-2 align-middle">
                                <FileInput
                                  multipleSelect={false}
                                  label="" // No visible label needed here
                                  name={`variation_image_${row.id}`} // Unique name for potential form submission (if not using hidden input)
                                  defaultValue={row.imageUrl} // Use imageUrl from row data for initial display
                                  onImageSelect={(selectedImages) =>
                                    handleImageChange(selectedImages, row.id)
                                  }
                                  showLabel={false}
                                  imagePreviewClassName="h-12 w-12 rounded-md object-cover border border-gray-200" // Style preview
                                  placeholderIconSize="h-6 w-6" // Style placeholder
                                  buttonClassName="p-0 m-0" // Minimal button styling
                                  containerClassName="w-full"
                                  // Pass row.image (the ID) if FileInput needs it for backend association
                                  // fileId={row.image}
                                />
                              </td>

                              {/* SKU Input Cell */}
                              <td className="px-4 py-2 align-middle">
                                <input
                                  type="text"
                                  placeholder="SKU"
                                  aria-label={`SKU for variation ${row.id}`} // Accessibility label
                                  value={row.sku ?? ""} // Controlled input, use empty string if null/undefined
                                  onChange={(e) =>
                                    handleInputChange(e, row.id, "sku")
                                  } // Update row state on change
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                />
                              </td>

                              {/* Price Input Cell */}
                              <td className="px-4 py-2 align-middle">
                                <input
                                  type="number"
                                  placeholder="0.00"
                                  aria-label={`Price for variation ${row.id}`} // Accessibility label
                                  step="0.01" // Allow decimal values for price
                                  min="0" // Prevent negative prices
                                  value={row.price ?? ""} // Controlled input
                                  onChange={(e) =>
                                    handleInputChange(e, row.id, "price")
                                  } // Update row state
                                  // Basic styling, remove number spinners for cleaner look
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </td>

                              {/* Quantity Input Cell */}
                              <td className="px-4 py-2 align-middle">
                                <input
                                  type="number"
                                  placeholder="0"
                                  aria-label={`Quantity for variation ${row.id}`} // Accessibility label
                                  step="1" // Whole numbers for quantity
                                  min="0" // Prevent negative quantity
                                  value={row.qty ?? ""} // Controlled input
                                  onChange={(e) =>
                                    handleInputChange(e, row.id, "qty")
                                  } // Update row state
                                  // Basic styling, remove number spinners
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </td>

                              {/* Action Cell (Delete Button) */}
                              <td className="px-4 py-2 align-middle text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(row.id)} // Call delete handler with row ID
                                  className="text-gray-400 hover:text-red-600 transition-colors duration-150 ease-in-out p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 inline-flex items-center justify-center"
                                  aria-label={`Delete variation ${row.id}`} // Accessibility label
                                >
                                  <DynamicTrashIcon className="h-4 w-4" />
                                  {/* Trash Icon */}
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                        {/* End AnimatePresence for rows */}
                      </motion.tbody>
                    </table>
                  </motion.div> // End Table Container
                ) : (
                  // --- Placeholders (Rendered when rows array is empty) ---
                  hasVariationsEnabled &&
                  isSectionExpanded && // Only show placeholders if section is visible
                  (Object.keys(selectedValues).length > 0 ? (
                    // Placeholder 1: When selections are made but no valid combinations result
                    <motion.div
                      key="no-combos-placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8 px-4 border border-dashed border-gray-300 rounded-lg bg-white"
                    >
                      <DynamicXCircleIcon className="mx-auto h-10 w-10 text-amber-400 mb-2" />
                      <h3 className="text-base font-medium text-gray-600">
                        No variation combinations generated.
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Please check your selections.
                      </p>
                    </motion.div>
                  ) : (
                    // Placeholder 2: When no selections have been made yet (and variations are possible)
                    variationList &&
                    variationList.length > 0 && ( // Only show if variations ARE defined
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
                          Choose values (like Color, Size) to generate specific
                          product variations.
                        </p>
                      </motion.div>
                    )
                  )) // End placeholder conditional rendering
                ) // End ternary check for rows.length > 0
              }
            </AnimatePresence>
            {/* End AnimatePresence for table/placeholders */}
          </motion.div> // End Main Variation Content Area
        )}
      </AnimatePresence>
      {/* End AnimatePresence for main section */}
      {/* Hidden Input for Form Submission */}
      {/* This input stores the final rows data as a JSON string */}
      <input
        name={name} // Use the name prop passed to the component
        type="hidden"
        // Stringify the rows array. If empty, provide an empty string or '[]'
        value={rows.length > 0 ? JSON.stringify(rows?.map(({variationValues,...rest})=>rest)) : ""}
        readOnly // Make it read-only as it's controlled by component state
      />
    </div> // End Main container div
  );
}
