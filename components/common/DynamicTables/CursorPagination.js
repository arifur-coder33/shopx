// components/common/DynamicTable/CursorPagination.js

import Button from "@/components/button"; // Assuming you have a button component
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CursorPagination({
  onNext,
  onPrevious,
  hasNextPage,
  hasPreviousPage,
  currentPage,
  totalCount,
  itemsPerPage,
  setItemsPerPage,
  itemsPerPageOptions = [10, 20, 50],
}) {
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : null;

  return (
    <div className="flex items-center justify-between py-4 text-[10px] md:text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-4">
        <div className="font-medium">
          {totalCount !== null ? `${totalCount} results` : ` `}
        </div>

        <div className="flex items-center gap-2">
          <select
            id="items-per-page"
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="rounded-md border-gray-300 bg-white py-1.5 pl-2 pr-2 text-[10px] md:text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-800"
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <label htmlFor="items-per-page" className="hidden sm:inline">
            per page
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          className="md:p-2 p-1"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center justify-center font-medium">
          Page {currentPage}
          {totalPages && ` of ${totalPages}`}
        </div>

        <Button
          variant="outline"
          className="md:p-2 p-1"
          onClick={onNext}
          disabled={!hasNextPage}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
