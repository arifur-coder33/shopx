"use client";

import { Search } from "lucide-react";
import { useState, useEffect } from "react";

// Helper to format ISO string for <input type="datetime-local" />
const toDateTimeLocal = (isoString) => {
  if (!isoString) return "";
  // Slice to 'YYYY-MM-DDTHH:mm' which is the format the input expects
  return isoString.slice(0, 16);
};

export default function TableToolbar({
  searchTerm,
  setSearchTerm,
  searchField,
  setSearchField,
  activeFilters,
  onFilterChange,
  filterSearchProperties,
  filterTagProperties,
}) {
  const selectedSearchLabel =
    filterSearchProperties.find((p) => p.field === searchField)?.label || "Search";

  const [timeUISelection, setTimeUISelection] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // This effect SYNCS the local UI state with the active filters from the parent
  useEffect(() => {
    const appliedTimeFilter = activeFilters.time;
    if (appliedTimeFilter) {
      if (typeof appliedTimeFilter === 'object' && appliedTimeFilter.type === 'custom') {
        setTimeUISelection('Custom');
        // This solves the date population problem
        setCustomStartDate(toDateTimeLocal(appliedTimeFilter.startDate));
        setCustomEndDate(toDateTimeLocal(appliedTimeFilter.endDate));
      } else {
        setTimeUISelection(appliedTimeFilter);
      }
    } else {
      setTimeUISelection(null); // No time filter is active
    }
  }, [activeFilters.time]);

  const handleTimeOptionClick = (option) => {
    // If clicking the currently active option, DESELECT it
    if (timeUISelection === option) {
      setTimeUISelection(null);
      // Tell the parent to remove the filter, but crucially, DO NOT fetch data
      onFilterChange('time', 'ALL', false); 
      return;
    }

    // Otherwise, SELECT the new option
    setTimeUISelection(option);

    // For simple tags, apply the filter and fetch immediately
    if (option !== 'Custom') {
      onFilterChange('time', option, true); // The 'true' here means "please fetch"
    }
  };
  
  // This handler applies the custom date and ALWAYS triggers a fetch
  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      onFilterChange("time", {
        type: "custom",
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      }, true);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center w-full md:w-auto">
        {/* ... search bar jsx ... */}
         <div className="flex rounded-md shadow-sm w-full md:w-2/5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-gray-900">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="cursor-pointer py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 text-sm px-3"
          >
            {filterSearchProperties.map((prop) => (
              <option key={prop.field} value={prop.field}>
                {prop.label}
              </option>
            ))}
          </select>
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder={`Search by ${selectedSearchLabel}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-r-md focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="space-y-3">
        {filterTagProperties.map((filterGroup) =>
          Object.entries(filterGroup).map(([key, options]) => (
            <div key={key} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize mr-2">
                {`${key}:`}
              </span>
              {options.map((option) => {
                 let isActive = false;
                 if (key === 'time') {
                   // Time filter active state is based on our local UI state
                   isActive = timeUISelection ? timeUISelection === option : option.toUpperCase() === 'ALL';
                 } else {
                   // Other filters (like status) are based directly on the parent's prop
                   isActive = activeFilters[key] ? activeFilters[key] === option : option.toUpperCase() === 'ALL';
                 }

                // Generic handler for non-time filters that toggles and fetches
                const handleGenericFilterClick = (filterKey, filterValue) => {
                    const isCurrentlyActive = activeFilters[filterKey] === filterValue;
                    onFilterChange(filterKey, isCurrentlyActive ? 'ALL' : filterValue, true);
                };

                return (
                  <button
                    key={option}
                    onClick={() => key === 'time' ? handleTimeOptionClick(option) : handleGenericFilterClick(key, option)}
                    className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                      isActive
                        ? "bg-purple-600 text-white shadow-md"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}

              {/* Custom Date Inputs */}
              {key === 'time' && (
                <div className={`flex items-center gap-2 pl-2 transition-opacity ${timeUISelection !== 'Custom' && 'opacity-50'}`}>
                    {/* ... date inputs and apply button ... */}
                     <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    disabled={timeUISelection !== 'Custom'}
                    className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    disabled={timeUISelection !== 'Custom'}
                    className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleApplyCustomDate}
                    disabled={timeUISelection !== 'Custom' || !customStartDate || !customEndDate}
                    className="px-3 py-1 text-sm rounded-full bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}