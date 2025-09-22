"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({
  currentPage,
  setCurrentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  totalResults,
}) {
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between pt-4">
      <div className="text-sm text-gray-700 dark:text-gray-400 mb-2 sm:mb-0">
        Showing{" "}
        <span className="font-semibold">
          {Math.min((currentPage - 1) * itemsPerPage + 1, totalResults)}
        </span>{" "}
        to{" "}
        <span className="font-semibold">
          {Math.min(currentPage * itemsPerPage, totalResults)}
        </span>{" "}
        of <span className="font-semibold">{totalResults}</span> results
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setCurrentPage((c) => c - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-gray-700 dark:text-gray-400">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((c) => c + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <select
          value={itemsPerPage}
          onChange={handleItemsPerPageChange}
          className="py-2 pl-2 pr-6 border-gray-300 rounded-md bg-gray-50 focus:ring-purple-500 focus:border-purple-500 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
