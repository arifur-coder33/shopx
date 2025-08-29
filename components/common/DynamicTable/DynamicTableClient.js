// components/common/DynamicTable/DynamicTableClient.js

"use client";

import { useDebounce } from "@/hooks/useDebounce";
import { Inbox } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import CursorPagination from "./CursorPagination";
import TableBody from "./TableBody";
import TableSkeleton from "./TableSkeleton";
import TableToolbar from "./TableToolbar";

// OPTIMIZATION: Extracted parameter building logic to a pure helper function.
const buildRequestParams = (params) => {
  const newParams = { ...params };

  // Handle search term
  if (!newParams.searchTerm || !newParams.searchField) {
    delete newParams.searchTerm;
    delete newParams.searchField;
  } else {
    newParams[newParams.searchField] = newParams.searchTerm;
    delete newParams.searchTerm;
    delete newParams.searchField;
  }

  // Clean up any "ALL" filters that are not meant for the API
  Object.keys(newParams).forEach((key) => {
    if (newParams[key] === "ALL") {
      delete newParams[key];
    }
  });

  // Handle date filtering
  if (newParams.time) {
    if (newParams.time.type === "custom") {
      newParams.startDate = newParams.time.startDate;
      newParams.endDate = newParams.time.endDate;
    } else if (typeof newParams.time === "string") {
      const now = new Date();
      let startDate;
      if (newParams.time === "last 24 hours")
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      else if (newParams.time === "last 7 days")
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      else if (newParams.time === "last 30 days")
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      if (startDate) {
        newParams.startDate = startDate.toISOString();
        newParams.endDate = now.toISOString();
      }
    }
    delete newParams.time;
  }

  return newParams;
};

// --- NEW HELPER FUNCTION ---
// Initializes the filter state from the default values in filterTagProperties
const initializeFilters = (filters) => {
  const initial = {};
  if (filters && Array.isArray(filters)) {
    filters.forEach((filter) => {
      // Set the filter only if a defaultValue is provided and it's not "ALL"
      if (filter.defaultValue && filter.defaultValue !== "ALL") {
        initial[filter.field] = filter.defaultValue;
      }
    });
  }
  return initial;
};

export default function DynamicTableClient({
  initialData = [],
  initialNextCursor,
  tableProperties = [],
  filterSearchProperties = [],
  filterTagProperties = [],
  fetchAction,
  initialItemsPerPage = 10,
  itemsPerPageOptions = [10, 25, 50],
  updateAction,
  deleteAction,
  actionType,
  componentKey,
  viewPageURL,
  getDataCount = () => Promise.resolve(null),
}) {
  const [data, setData] = useState(initialData);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [currentCursor, setCurrentCursor] = useState(null);
  const [previousCursors, setPreviousCursors] = useState([]);

  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [searchField, setSearchField] = useState(
    filterSearchProperties[0]?.field || ""
  );

  // --- MODIFIED STATE INITIALIZATION ---
  const [activeFilters, setActiveFilters] = useState(() =>
    initializeFilters(filterTagProperties)
  );

  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    field: "createdAt",
    direction: "desc",
  });

  const [isPending, startTransition] = useTransition();
  const isInitialMount = useRef(true);

  const baseFetchConfig = useMemo(
    () => ({
      ...activeFilters,
      searchTerm: debouncedSearchTerm,
      searchField,
    }),
    [activeFilters, debouncedSearchTerm, searchField]
  );

  const fetchData = useCallback(
    async (cursor, config) => {
      startTransition(async () => {
        const params = buildRequestParams({
          ...config,
          limit: itemsPerPage,
          cursor,
          sortField: sortConfig.field,
          sortDirection: sortConfig.direction,
          tableProperties,
        });

        const {
          success,
          data: newData,
          nextCursor: newNextCursor,
        } = await fetchAction(params);

        if (success) {
          setData(newData);
          setNextCursor(newNextCursor);
          setExpandedRows(new Set());
        }
      });
    },
    [itemsPerPage, sortConfig, tableProperties, fetchAction]
  );

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Fetch initial total count based on default filters
      const initialCountParams = buildRequestParams(
        initializeFilters(filterTagProperties)
      );

      getDataCount(initialCountParams).then((res) => {
        if (res.success) setTotalCount(res.count);
      });
      return;
    }

    setCurrentPage(1);
    setPreviousCursors([]);
    setCurrentCursor(null);

    startTransition(async () => {
      const countParams = buildRequestParams(baseFetchConfig);
      const countResult = await getDataCount(countParams);
      if (countResult.success) {
        setTotalCount(countResult.count);
      }
    });

    fetchData(null, baseFetchConfig);
  }, [baseFetchConfig, sortConfig, itemsPerPage, getDataCount, fetchData]); // filterTagProperties removed from deps

  const handleNext = () => {
    if (nextCursor) {
      setPreviousCursors((prev) => [...prev, currentCursor]);
      setCurrentCursor(nextCursor);
      setCurrentPage((prev) => prev + 1);
      fetchData(nextCursor, baseFetchConfig);
    }
  };

  const handlePrevious = () => {
    if (previousCursors.length > 0) {
      const newPreviousCursors = [...previousCursors];
      const previousPageCursor = newPreviousCursors.pop();
      setPreviousCursors(newPreviousCursors);
      setCurrentCursor(previousPageCursor);
      setCurrentPage((prev) => prev - 1);
      fetchData(previousPageCursor, baseFetchConfig);
    }
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      // If the new value is "ALL", remove the filter key entirely.
      // This makes the logic cleaner elsewhere (e.g., checking !activeFilters[key]).
      if (value === "ALL") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const handleSort = (field) => {
    setSortConfig((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
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
        <TableSkeleton rows={itemsPerPage} columns={tableProperties.length} />
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
            actions={{
              updateAction,
              deleteAction,
              actionType,
              componentKey,
              viewPageURL,
            }}
          />
          <CursorPagination
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNextPage={!!nextCursor}
            hasPreviousPage={previousCursors.length > 0}
            currentPage={currentPage}
            totalCount={totalCount}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            itemsPerPageOptions={itemsPerPageOptions}
          />
        </>
      )}
    </div>
  );
}
