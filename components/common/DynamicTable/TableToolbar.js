// components/common/DynamicTable/TableToolbar.js

"use client";

import { Search } from "lucide-react";
import FilterTagButton from "./FilterTagButton";
import TimeFilter from "./TimeFilter";

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
    filterSearchProperties.find((p) => p.field === searchField)?.label ||
    "Search";

  return (
    <div className="space-y-4">
      {/* Search Input Section */}
      <div className="flex items-center w-full md:w-auto">
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

      {/* Filters Section */}
      <div className="space-y-3">
        {filterTagProperties.map((filterGroup) =>
          Object.entries(filterGroup).map(([key, options]) => (
            <div key={key}>
              {key === "time" ? (
                <TimeFilter
                  activeTimeFilter={activeFilters.time}
                  onTimeChange={(value) => onFilterChange("time", value)}
                />
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize mr-2">{`${key}:`}</span>
                  {options.map((option) => (
                    <FilterTagButton
                      key={option}
                      label={option}
                      // --- MODIFIED LOGIC HERE ---
                      // A button is active if it's the current filter.
                      // OR if the button is "All" and no filter is set for this key (value is falsy or "ALL").
                      isActive={
                        activeFilters[key] === option ||
                        (option === "All" &&
                          (!activeFilters[key] || activeFilters[key] === "ALL"))
                      }
                      onClick={() =>
                        onFilterChange(
                          key,
                          activeFilters[key] === option ? "ALL" : option
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
