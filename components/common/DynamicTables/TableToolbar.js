// components/common/DynamicTable/TableToolbar.js

"use client";

import { Search, X } from "lucide-react";
import FilterTagButton from "./FilterTagButton";
import TimeFilter from "./TimeFilter";
import { useState } from "react";

export default function TableToolbar({
  searchValues,
  setSearchValues,
  activeFilters,
  onFilterChange,
  onClearFilters,
  filterSearchProperties = [],
  filterTagProperties = [],
}) {
  const [searchField, setSearchField] = useState(filterSearchProperties[0]?.field || "");
  const hasFilters = Object.values(searchValues || {}).some((value) => String(value || "").trim()) || Object.keys(activeFilters || {}).length > 0;
  const selectedSearch = filterSearchProperties.find((item) => item.field === searchField);
  const activeSearches = filterSearchProperties.filter((item) => String(searchValues[item.field] || "").trim());

  return (
    <div className="z-10 space-y-2 bg-white py-2 text-sm dark:bg-gray-900">
      <div className="scrollbar-hide flex w-full items-center gap-2 overflow-x-auto pb-1">
      {/* Search Input Section */}
      {filterSearchProperties.length > 0 && <div className="w-[min(24rem,85vw)] shrink-0">
        <div className="flex h-10 w-full rounded-md shadow-sm focus-within:ring-2 focus-within:ring-purple-500">
          <select value={searchField} onChange={(event) => setSearchField(event.target.value)} className="h-10 max-w-32 cursor-pointer rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-2 py-1 text-sm text-gray-700 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {filterSearchProperties.map((prop) => <option key={prop.field} value={prop.field}>{prop.label}</option>)}
          </select>
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              aria-label={`Search by ${selectedSearch?.label || "field"}`}
              placeholder={`Search by ${selectedSearch?.label || "field"}...`}
              value={searchValues[searchField] || ""}
              onChange={(event) => setSearchValues((values) => ({ ...values, [searchField]: event.target.value }))}
              className="h-10 w-full rounded-r-md border border-gray-300 py-1 pl-3 pr-9 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>}

      {/* --- MODIFIED FILTERS SECTION --- */}
      {/* <div className="space-y-3 ">
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
                            : option,
                        )
                      }
                    />
                  ))}
                </span>
              </div>
            )}
          </div>
        ))}
      </div> */}
      <div className="flex shrink-0 flex-col items-start gap-1.5">
        {filterTagProperties?.map((filterGroup, i) => (
          <div key={filterGroup?.field || i} className="shrink-0">
            {filterGroup.field === "time" ? (
              // TIME FILTER (always scrollable)
              <span className="flex items-center">
                <TimeFilter
                  activeTimeFilter={activeFilters[filterGroup.field]}
                  onTimeChange={(value) =>
                    onFilterChange(filterGroup.field, value)
                  }
                  options={filterGroup.options}
                />
              </span>
            ) : (
              <div className="flex items-center gap-1.5">
                {/* Label */}
                <span className="mr-1 whitespace-nowrap text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {`${filterGroup.label}:`}
                </span>

                {/* Filter Buttons */}
                <div
                  className="flex items-center gap-1"
                >
                  {filterGroup?.options?.map((option) => (
                    <FilterTagButton
                      key={option}
                      label={option}
                      isActive={
                        activeFilters[filterGroup.field] === option ||
                        (option === "ALL" && !activeFilters[filterGroup.field])
                      }
                      onClick={() =>
                        onFilterChange(
                          filterGroup.field,
                          activeFilters[filterGroup.field] === option
                            ? "ALL"
                            : option,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {hasFilters && <button type="button" onClick={onClearFilters} className="inline-flex h-9 shrink-0 items-center justify-center gap-1 rounded-md border border-gray-300 px-2.5 text-xs font-semibold hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"><X className="h-4 w-4" /> Remove filters</button>}
      </div>
      {activeSearches.length > 0 && <div className="flex flex-wrap gap-2">{activeSearches.map((item) => <button key={item.field} type="button" onClick={() => setSearchValues((values) => ({ ...values, [item.field]: "" }))} className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary"><span>{item.label}: {searchValues[item.field]}</span><X className="h-3 w-3" /></button>)}</div>}
    </div>
  );
}
