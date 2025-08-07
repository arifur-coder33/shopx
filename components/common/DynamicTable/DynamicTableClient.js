"use client";

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
  updateAction,
  deleteAction,
  actionType,
  componentKey,
  initialItemsPerPage = 10,
}) {
  const [data, setData] = useState(initialData);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [previousCursors, setPreviousCursors] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState(filterSearchProperties[0]?.field || "");
  const [activeFilters, setActiveFilters] = useState({});
  const [expandedRows, setExpandedRows] = useState(new Set());

  const [sortConfig, setSortConfig] = useState({ field: "createdAt", direction: "desc" });
  const [isPending, startTransition] = useTransition();
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const isInitialMount = useRef(true);

  const fetchData = useCallback(
    async (cursor, isPagingBack = false) => {
        // ... (fetchData logic remains the same as the previous step)
         const params = {
        limit: initialItemsPerPage,
        cursor,
        tableProperties,
        sortField: sortConfig.field,
        sortDirection: sortConfig.direction,
      };

      // Add active filters to params, but exclude complex objects like the custom time filter
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (typeof value === 'string') {
          params[key] = value;
        }
      });

      if (debouncedSearchTerm && searchField) {
        params[searchField] = debouncedSearchTerm;
      }
      
      // Handle time filters
      const timeFilter = activeFilters.time;
      if (timeFilter?.type === 'custom') {
        // Use custom date range if provided
        params.startDate = new Date(timeFilter.startDate).toISOString();
        params.endDate = new Date(timeFilter.endDate).toISOString();
        if(params.time) delete params.time;
      } else if (typeof timeFilter === 'string') {
        // Handle preset time ranges
        const now = new Date();
        let startDate;
        if (timeFilter === "last 24 hours") startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        else if (timeFilter === "last 7 days") startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        else if (timeFilter === "last 30 days") startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        if (startDate) {
          params.startDate = startDate.toISOString();
          params.endDate = now.toISOString();
        }
        if(params.time) delete params.time;
      }

      startTransition(async () => {
        const { success, data: newData, nextCursor: newNextCursor, error } = await fetchAction(params);
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
    [activeFilters, debouncedSearchTerm, searchField, fetchAction, initialItemsPerPage, tableProperties, sortConfig]
  );
  
  const fetchDataRef = useRef(fetchData);
  useEffect(() => {
    fetchDataRef.current = fetchData;
  });

  useEffect(() => {
    if (isInitialMount.current) return;
    setPreviousCursors([]);
    fetchDataRef.current(null);
  }, [debouncedSearchTerm, activeFilters, sortConfig]);

  useEffect(() => {
    if (isInitialMount.current) return;
    if (debouncedSearchTerm) {
      setPreviousCursors([]);
      fetchDataRef.current(null);
    }
  }, [searchField]);
  
  useEffect(() => { isInitialMount.current = false; }, []);

  const handleFilterChange = (key, value, shouldFetch = true) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (value === "ALL") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };
  
  const handleSort = (field) => {
    setSortConfig((prevConfig) => ({
      field,
      direction: prevConfig.field === field && prevConfig.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleNext = () => { if (nextCursor) fetchData(data[data.length - 1]?.id); };
  const handlePrevious = () => {
    const newPreviousCursors = [...previousCursors];
    const lastCursor = newPreviousCursors.pop();
    setPreviousCursors(newPreviousCursors);
    fetchData(lastCursor, true);
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-lg sm:rounded-lg p-4 space-y-4">
      {/* Pass the new handleFilterChange to the Toolbar */}
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
      {/* ... rest of the component JSX */}
        {isPending ? (
        <TableSkeleton rows={initialItemsPerPage} columns={tableProperties.length} />
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