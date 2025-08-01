"use client";

import { Inbox } from "lucide-react";
import { useMemo, useState } from "react";
import TableBody from "./TableBody";
import TablePagination from "./TablePagination";
import TableToolbar from "./TableToolbar";

export default function DynamicTableClient({
  data = [],
  tableProperties = [],
  filterSearchProperties = [],
  filterTagProperties = [],
  updateAction,
  deleteAction,
  actionType,
  componentKey,
  initialItemsPerPage = 10,
}) {
  // --- STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(
    filterSearchProperties[0]?.field || ""
  );
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // --- CORE LOGIC: Memoized Filtering ---
  const filteredData = useMemo(() => {
    let filtered = [...data];
    if (searchTerm && searchField) {
      filtered = filtered.filter((item) => {
        const value = item[searchField];
        return (
          value &&
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (key === "time") {
        const now = new Date();
        let pastDate;
        if (value === "last 24 hours")
          pastDate = new Date(now.setDate(now.getDate() - 1));
        else if (value === "last 7 days")
          pastDate = new Date(now.setDate(now.getDate() - 7));
        else if (value === "last 30 days")
          pastDate = new Date(now.setDate(now.getDate() - 30));
        if (pastDate)
          filtered = filtered.filter(
            (item) => new Date(item.createdAt) >= pastDate
          );
      } else {
        filtered = filtered.filter((item) => item[key] === value);
      }
    });
    return filtered;
  }, [data, searchTerm, searchField, activeFilters]);

  // --- DERIVED STATE: Memoized Pagination ---
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // --- EVENT HANDLERS ---
  const handleReset = () => {
    setSearchTerm("");
    setActiveFilters({});
    setSearchField(filterSearchProperties[0]?.field || "");
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setCurrentPage(1);
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[key] === value) delete newFilters[key];
      else newFilters[key] = value;
      return newFilters;
    });
  };

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-500 p-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <Inbox className="w-16 h-16 mb-4 text-gray-400" />
        <p className="text-lg font-semibold">No Data Available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg sm:rounded-lg p-4 space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        searchField={searchField}
        setSearchField={setSearchField}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
        filterSearchProperties={filterSearchProperties}
        filterTagProperties={filterTagProperties}
      />

      <TableBody
        paginatedData={paginatedData}
        tableProperties={tableProperties}
        expandedRows={expandedRows}
        setExpandedRows={setExpandedRows}
        actions={{ updateAction, deleteAction, actionType, componentKey }}
      />

      {totalPages > 1 && (
        <TablePagination
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          totalResults={filteredData.length}
        />
      )}
    </div>
  );
}
