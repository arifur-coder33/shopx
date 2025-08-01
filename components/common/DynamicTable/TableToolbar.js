"use client";

import { Search, X } from "lucide-react";

export default function TableToolbar({
  searchTerm,
  setSearchTerm,
  searchField,
  setSearchField,
  activeFilters,
  onFilterChange,
  onReset,
  filterSearchProperties,
  filterTagProperties,
}) {
  const selectedSearchLabel =
    filterSearchProperties.find((p) => p.field === searchField)?.label ||
    "Search";
  const isFilterActive = searchTerm || Object.keys(activeFilters).length > 0;

  return (
    <div className="space-y-4">
      {/* Row 1: Search Bar */}
      <div className="flex items-center w-full md:w-auto">
        <div className="flex rounded-md shadow-sm w-full md:w-2/5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:ring-offset-2 focus-within:ring-offset-white dark:focus-within:ring-offset-gray-900">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
            className="py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-700 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 text-sm px-3"
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
      {/* Row 2: Tag Filters & Reset Button */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTagProperties.map((filterGroup) =>
          Object.entries(filterGroup).map(([key, options]) =>
            options.map((option) => (
              <button
                key={option}
                onClick={() => onFilterChange(key, option)}
                className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
                  activeFilters[key] === option
                    ? "bg-purple-600 text-white shadow"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {option}
              </button>
            ))
          )
        )}
        {isFilterActive && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1 text-sm text-red-600 bg-red-100 border border-red-200 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900 transition-colors"
          >
            <X className="w-4 h-4" /> Reset
          </button>
        )}
      </div>
    </div>
  );
}
