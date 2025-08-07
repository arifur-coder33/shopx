// components/common/DynamicTable/TableToolbar.js

"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

const toDateTimeLocal = (isoString) => {
  if (!isoString) return "";
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
    filterSearchProperties.find((p) => p.field === searchField)?.label ||
    "Search";
  const [timeUISelection, setTimeUISelection] = useState(null);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    const appliedTimeFilter = activeFilters.time;
    if (appliedTimeFilter) {
      if (
        typeof appliedTimeFilter === "object" &&
        appliedTimeFilter.type === "custom"
      ) {
        setTimeUISelection("Custom");
        setCustomStartDate(toDateTimeLocal(appliedTimeFilter.startDate));
        setCustomEndDate(toDateTimeLocal(appliedTimeFilter.endDate));
      } else {
        setTimeUISelection(appliedTimeFilter);
      }
    } else {
      setTimeUISelection(null);
    }
  }, [activeFilters.time]);

  const handleTimeOptionClick = (option) => {
    if (timeUISelection === option) {
      setTimeUISelection(null);
      onFilterChange("time", "ALL");
      return;
    }
    setTimeUISelection(option);
    if (option !== "Custom") {
      onFilterChange("time", option);
    }
  };

  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      onFilterChange("time", {
        type: "custom",
        startDate: new Date(customStartDate).toISOString(),
        endDate: new Date(customEndDate).toISOString(),
      });
    }
  };

  const handleGenericFilterClick = (key, value) => {
    const isCurrentlyActive = activeFilters[key] === value;
    onFilterChange(key, isCurrentlyActive ? "ALL" : value);
  };

  return (
    <div className="space-y-4">
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
      <div className="space-y-3">
        {filterTagProperties.map((filterGroup) =>
          Object.entries(filterGroup).map(([key, options]) => (
            <div key={key} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize mr-2">{`${key}:`}</span>
              {options.map((option) => {
                let isActive = false;
                if (key === "time") {
                  isActive = timeUISelection
                    ? timeUISelection === option
                    : option === "ALL";
                } else {
                  isActive = activeFilters[key]
                    ? activeFilters[key] === option
                    : option === "ALL";
                }
                return (
                  <button
                    key={option}
                    onClick={() =>
                      key === "time"
                        ? handleTimeOptionClick(option)
                        : handleGenericFilterClick(key, option)
                    }
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
              {key === "time" && (
                <div
                  className={`flex items-center gap-2 pl-2 transition-opacity ${
                    timeUISelection !== "Custom" && "opacity-50"
                  }`}
                >
                  <input
                    type="datetime-local"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    disabled={timeUISelection !== "Custom"}
                    className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 disabled:cursor-not-allowed"
                  />
                  <span className="text-gray-500">-</span>
                  <input
                    type="datetime-local"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    disabled={timeUISelection !== "Custom"}
                    className="text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleApplyCustomDate}
                    disabled={
                      timeUISelection !== "Custom" ||
                      !customStartDate ||
                      !customEndDate
                    }
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
