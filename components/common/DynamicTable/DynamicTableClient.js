"use client";

import { useDebounce } from "@/hooks/useDebounce"; // Assuming you have a debounce hook
import { Inbox } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
  const [activeFilters, setActiveFilters] = useState({ status: "ALL" });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({
    field: "createdAt", // Default sort field
    direction: "desc", // Default sort direction
  });

  const [isPending, startTransition] = useTransition();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);
  const fetchData = useCallback(
    async (cursor, isPagingBack = false) => {
      const params = {
        limit: initialItemsPerPage + 1, // Fetch one extra to check for next page
        cursor,
        ...activeFilters,
        tableProperties,
        sortField: sortConfig.field,
        sortDirection: sortConfig.direction,
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
      sortConfig,
    ]
  );
  console.log(activeFilters);
  const handleSort = (field) => {
    // A. Update the state
    setSortConfig((prevConfig) => {
      const direction =
        prevConfig.field === field && prevConfig.direction === "asc"
          ? "desc"
          : "asc";
      return { field, direction };
    });
  };

  useEffect(() => {
    setPreviousCursors([]); // Reset pagination
    fetchData(null); // Refetch data from page 1 with the new sort
  }, [sortConfig]);

  // Effect for search/filter changes (resets pagination)
  useEffect(() => {
    // Prevent fetching on the very first render because we already have initialData
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Any change to search or filters should reset pagination and fetch from page 1
    setPreviousCursors([]);
    fetchData(null);
  }, [debouncedSearchTerm, activeFilters]); // Removed fetchData from deps

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

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };

      // If "All" is clicked, or if the active filter is clicked again,
      // remove the filter for that key. This reverts it to the "All" state.
      if (value === "All" || newFilters[key] === value) {
        delete newFilters[key];
      } else {
        // Otherwise, set the new filter.
        newFilters[key] = value;
      }

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
            sortConfig={sortConfig}
            onSort={handleSort}
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
