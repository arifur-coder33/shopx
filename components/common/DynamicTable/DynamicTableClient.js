// components/common/DynamicTable/DynamicTableClient.js

"use client";

import { getOrderCount } from "@/backend/serverActions/orderActions";
import { useDebounce } from "@/hooks/useDebounce";
import { Inbox } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import CursorPagination from "./CursorPagination";
import TableBody from "./TableBody";
import TableSkeleton from "./TableSkeleton";
import TableToolbar from "./TableToolbar";

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
}) {
  const [data, setData] = useState(initialData);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [currentCursor, setCurrentCursor] = useState(null);
  const [previousCursors, setPreviousCursors] = useState([]);

  const [totalCount, setTotalCount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(
    filterSearchProperties[0]?.field || ""
  );
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({
    field: "createdAt",
    direction: "desc",
  });

  const [isPending, startTransition] = useTransition();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);

  const fetchData = useCallback(
    async (cursor) => {
      const params = {
        limit: itemsPerPage,
        cursor,
        tableProperties,
        sortField: sortConfig.field,
        sortDirection: sortConfig.direction,
        ...activeFilters,
      };
      if (debouncedSearchTerm && searchField) {
        params[searchField] = debouncedSearchTerm;
      }

      if (params.time?.type === "custom") {
        params.startDate = params.time.startDate;
        params.endDate = params.time.endDate;
        delete params.time;
      } else if (typeof params.time === "string") {
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
        } = await fetchAction(params);
        if (success) {
          setData(newData);
          setNextCursor(newNextCursor);
          setExpandedRows(new Set());
        }
      });
    },
    [
      itemsPerPage,
      activeFilters,
      debouncedSearchTerm,
      searchField,
      fetchAction,
      tableProperties,
      sortConfig,
    ]
  );

  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  useEffect(() => {
    if (isInitialMount.current) {
      getOrderCount({}).then((res) => {
        if (res.success) setTotalCount(res.count);
      });
      isInitialMount.current = false;
      return;
    }

    const resetAndFetch = () => {
      startTransition(async () => {
        const filters = { ...activeFilters };
        if (debouncedSearchTerm && searchField) {
          filters[searchField] = debouncedSearchTerm;
        }

        const countResult = await getOrderCount(filters);
        if (countResult.success) setTotalCount(countResult.count);

        setPreviousCursors([]);
        setCurrentCursor(null);
        setCurrentPage(1);
        fetchDataRef.current(null);
      });
    };
    resetAndFetch();
  }, [debouncedSearchTerm, activeFilters, sortConfig, itemsPerPage]);

  const handleNext = () => {
    if (nextCursor) {
      setPreviousCursors((prev) => [...prev, currentCursor]);
      setCurrentCursor(nextCursor);
      fetchData(nextCursor);
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (previousCursors.length > 0) {
      const newPreviousCursors = [...previousCursors];
      const previousPageCursor = newPreviousCursors.pop();
      setPreviousCursors(newPreviousCursors);
      setCurrentCursor(previousPageCursor);
      fetchData(previousPageCursor);
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (
        value === "ALL" ||
        JSON.stringify(newFilters[key]) === JSON.stringify(value)
      ) {
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
