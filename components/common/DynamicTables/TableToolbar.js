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
  filterSearchProperties = [],
  filterTagProperties = [],
}) {
  const selectedSearchLabel =
    filterSearchProperties.find((p) => p.field === searchField)?.label ||
    "Search";

  return (
    <div className=" z-10 bg-white dark:bg-gray-900 py-2 flex md:flex-row flex-col gap-2 md:text-sm text-[10px] ">
      {/* Search Input Section */}
      <div className="flex items-center w-full md:w-auto">
        <div className="flex rounded-md shadow-sm w-full  focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-gray-900">
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

      {/* --- MODIFIED FILTERS SECTION --- */}
      <div className="space-y-3 ">
        {filterTagProperties?.map((filterGroup, i) => (
          <div key={filterGroup?.field || i}>
            {filterGroup.field === "time" ? (
              <span className="flex flex-row overflow-x-auto scrollbar-hide">
                <TimeFilter
                  activeTimeFilter={activeFilters[filterGroup.field]}
                  onTimeChange={(value) =>
                    onFilterChange(filterGroup.field, value)
                  }
                  options={filterGroup.options}
                />
              </span>
            ) : (
              <div className="flex flex-row items-center gap-2 ">
                <span className=" font-semibold text-gray-700 dark:text-gray-300 mr-2">
                  {`${filterGroup.label}:`}
                </span>
                <span className=" overflow-x-auto scrollbar-hide flex flex-row gap-2">
                  {filterGroup?.options?.map((option) => (
                    <FilterTagButton
                      key={option}
                      label={option}
                      // A button is active if it's the current filter,
                      // OR if the button is "ALL" and no filter is set for this key.
                      isActive={
                        activeFilters[filterGroup.field] === option ||
                        (option === "ALL" && !activeFilters[filterGroup.field])
                      }
                      onClick={() =>
                        onFilterChange(
                          filterGroup.field,
                          // If the clicked button is already active, set filter to "ALL" to clear it
                          activeFilters[filterGroup.field] === option
                            ? "ALL"
                            : option
                        )
                      }
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
