"use client";

import { useDebounce } from "@/hooks/useDebounce"; // Assuming you have a debounce hook
import { Inbox } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import CursorPagination from "./CursorPagination"; // We'll create this new component
import TableBody from "./TableBody";
import TableSkeleton from "./TableSkeleton"; // Import the skeleton
import TableToolbar from "./TableToolbar";

export default function DynamicTableClient({
  initialData = [],
  initialNextCursor,
  tableProperties = [],
  filterSearchProperties = [],
  filterTagProperties = [],
  fetchAction,
  updateAction,
  deleteAction,
  actionType,
  componentKey,
  initialItemsPerPage = 10,
}) {
  const [data, setData] = useState(initialData);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [previousCursors, setPreviousCursors] = useState([]); // Stack to go back

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(
    filterSearchProperties[0]?.field || ""
  );
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());

  const [isPending, startTransition] = useTransition();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchData = useCallback(
    async (cursor, isPagingBack = false) => {
      const params = {
        limit: initialItemsPerPage + 1, // Fetch one extra to check for next page
        cursor,
        ...activeFilters,
        tableProperties,
      };

      if (debouncedSearchTerm && searchField)
        params[searchField] = debouncedSearchTerm;

      if (params.time) {
        const now = new Date();
        let startDate;
        if (params.time === "last 24 hours")
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (params.time === "last 7 days")
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (params.time === "last 30 days")
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (startDate) {
          params.startDate = startDate.toISOString();
          params.endDate = now.toISOString();
        }
        delete params.time;
      }

      startTransition(async () => {
        const {
          success,
          data: newData,
          nextCursor: newNextCursor,
          error,
        } = await fetchAction(params);
        if (success) {
          setData(newData);
          setNextCursor(newNextCursor);
          setExpandedRows(new Set());
          if (!isPagingBack && cursor) {
            setPreviousCursors((prev) => [...prev, cursor]);
          }
        } else {
          console.error("Failed to fetch data:", error);
        }
      });
    },
    [
      activeFilters,
      debouncedSearchTerm,
      searchField,
      fetchAction,
      initialItemsPerPage,
      tableProperties,
    ]
  );

  // Effect for search/filter changes (resets pagination)
  useEffect(() => {
    // Don't run on initial render
    if (debouncedSearchTerm !== "" || Object.keys(activeFilters).length > 0) {
      setPreviousCursors([]); // Reset pagination history
      fetchData(null);
    }
  }, [debouncedSearchTerm, activeFilters, fetchData]);

  const handleNext = () => {
    if (nextCursor) {
      // The cursor for the *next* page is the ID of the last item on the *current* page.
      const lastId = data[data.length - 1]?.id;
      fetchData(lastId);
    }
  };

  const handlePrevious = () => {
    const newPreviousCursors = [...previousCursors];
    const lastCursor = newPreviousCursors.pop();
    setPreviousCursors(newPreviousCursors);
    fetchData(lastCursor, true);
  };

  const handleReset = () => {
    setSearchTerm("");
    setActiveFilters({});
    setPreviousCursors([]);
    // Fetch the very first page
    fetchData(null);
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[key] === value) delete newFilters[key];
      else newFilters[key] = value;
      return newFilters;
    });
  };

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

      {isPending ? (
        <TableSkeleton
          rows={initialItemsPerPage}
          columns={tableProperties.length}
        />
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-gray-500 p-10">
          <Inbox className="w-16 h-16 mb-4 text-gray-400" />
          <p className="text-lg font-semibold">No Results Found</p>
        </div>
      ) : (
        <>
          <TableBody
            paginatedData={data}
            tableProperties={tableProperties}
            expandedRows={expandedRows}
            setExpandedRows={setExpandedRows}
            actions={{ updateAction, deleteAction, actionType, componentKey }}
          />
          <CursorPagination
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNextPage={!!nextCursor}
            hasPreviousPage={previousCursors.length > 0}
          />
        </>
      )}
    </div>
  );
}
