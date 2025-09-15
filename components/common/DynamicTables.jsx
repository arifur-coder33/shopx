"use client";

import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Inbox,
  Minus,
  Plus,
  Search,
  Trash,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useMemo, useState } from "react";

// --- COMPONENT IMPORTS (Ensure paths are correct) ---
import Imagecustom from "../images/ImageCustom";
import CheckBox from "../input/CheckBox";
import SearchableDropdown from "../input/SearchableDropdown";
import LazyModalButton from "../modal/LazyModalButton";
import DeleteItem from "./DeleteItem";

// --- HELPER: Renders a single cell based on column type ---
const renderDynamicField = (item, column) => {
  const { field, type, alt, dropDownLists, action, objectPropertyName } =
    column;
  const value = item?.[field];

  switch (type) {
    case "image":
      const imageUrl = value?.name || item?.mainImage || value;
      return imageUrl ? (
        <Imagecustom
          src={imageUrl}
          w={40}
          h={40}
          alt={item?.[alt] || "Table image"}
          className="object-cover rounded-md"
        />
      ) : (
        <span className="text-xs text-gray-400">No Image</span>
      );
    case "dropdown":
      return (
        <SearchableDropdown
          dropDownLists={dropDownLists}
          defaultId={value}
          itemId={item?.id}
        />
      );
    case "checkbox":
      return <CheckBox value={!!value} action={action} id={item?.id} />;
    case "date":
      return value ? (
        <span className="whitespace-nowrap">
          {new Date(value).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ) : (
        <span className="text-xs text-gray-400">No Date</span>
      );
    case "object":
      return (
        item?.[field]?.[objectPropertyName] || (
          <span className="text-xs text-gray-400">N/A</span>
        )
      );
    default:
      return value != null ? (
        <span className="block max-w-[200px] truncate" title={String(value)}>
          {String(value)}
        </span>
      ) : (
        <span className="text-xs text-gray-400">N/A</span>
      );
  }
};

// --- MAIN COMPONENT ---
export default function DynamicTable({
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

  const expandColumn = tableProperties.find((p) => p.type === "expand");

  // --- CORE LOGIC: Memoized Filtering & Pagination ---
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

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const toggleRow = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) newExpandedRows.delete(id);
    else newExpandedRows.add(id);
    setExpandedRows(newExpandedRows);
  };

  const handleFilterChange = (key, value) => {
    setActiveFilters((prev) => {
      const newFilters = { ...prev };
      if (newFilters[key] === value) delete newFilters[key];
      else newFilters[key] = value;
      return newFilters;
    });
    setCurrentPage(1);
  };

  const selectedSearchLabel =
    filterSearchProperties.find((p) => p.field === searchField)?.label ||
    "Search";
  const isFilterActive = searchTerm || Object.keys(activeFilters).length > 0;

  // --- RENDER ---
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
      {/* --- Toolbar --- */}
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
                  onClick={() => handleFilterChange(key, option)}
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
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1 text-sm text-red-600 bg-red-100 border border-red-200 rounded-full hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900 transition-colors"
            >
              <X className="w-4 h-4" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* --- Table Container --- */}
      <div className="relative overflow-x-auto border-t border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              {tableProperties.map((c) => (
                <th key={c.field} scope="col" className="px-6 py-3">
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((item) => (
                <React.Fragment key={item.id}>
                  {/* Main Row */}
                  <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                    {tableProperties.map((column) => (
                      <td key={column.field} className="px-6 py-4 align-middle">
                        {column.type === "expand" ? (
                          <button
                            onClick={() => toggleRow(item.id)}
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            {expandedRows.has(item.id) ? (
                              <Minus className="w-4 h-4 text-purple-600" />
                            ) : (
                              <Plus className="w-4 h-4 text-purple-500" />
                            )}
                          </button>
                        ) : (
                          renderDynamicField(item, column)
                        )}
                      </td>
                    ))}
                    <td className="px-6 py-4 flex items-center justify-center space-x-3 align-middle">
                      {item?.slug && (
                        <Link
                          href={`/product/${encodeURIComponent(item.slug)}`}
                          title="View on site"
                        >
                          <Eye className="w-5 h-5 text-green-500 hover:text-green-600 hover:scale-110 transition-transform" />
                        </Link>
                      )}
                      <LazyModalButton
                        button={
                          <Edit className="w-5 h-5 text-blue-500 hover:text-blue-600 hover:scale-110 transition-transform" />
                        }
                        data={item}
                        updateAction={updateAction}
                        actionType={actionType}
                        componentKey={componentKey}
                      />
                      <DeleteItem deleteItem={deleteAction} id={item.id}>
                        <Trash className="w-5 h-5 text-red-500 hover:text-red-600 hover:scale-110 transition-transform" />
                      </DeleteItem>
                    </td>
                  </tr>
                  {/* Expanded Row with Nested Table */}
                  {expandColumn && (
                    <tr className="bg-white dark:bg-gray-800">
                      <td colSpan={tableProperties.length + 1} className="p-0">
                        <div
                          className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                            expandedRows.has(item.id)
                              ? "max-h-[1000px]"
                              : "max-h-0"
                          }`}
                        >
                          <div className="bg-slate-50 dark:bg-gray-800/50 p-4">
                            <h4 className="text-md font-semibold mb-3 text-gray-800 dark:text-gray-200">
                              Order Items
                            </h4>
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 rounded-lg overflow-hidden">
                              <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                  {expandColumn.expandProperties.map((prop) => (
                                    <th key={prop.field} className="px-4 py-2">
                                      {prop.label}
                                    </th>
                                  ))}
                                  <th className="px-4 py-2 text-center">
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {item[expandColumn.field]?.map((nestedItem) => (
                                  <tr
                                    key={nestedItem.id}
                                    className="bg-white border-b dark:bg-gray-800 dark:border-gray-700"
                                  >
                                    {expandColumn.expandProperties.map(
                                      (prop) => (
                                        <td
                                          key={prop.field}
                                          className="px-4 py-2 align-middle"
                                        >
                                          {renderDynamicField(nestedItem, prop)}
                                        </td>
                                      )
                                    )}
                                    <td className="px-4 py-2 flex items-center justify-center space-x-3 align-middle">
                                      <LazyModalButton
                                        button={
                                          <Edit className="w-4 h-4 text-blue-500 hover:text-blue-600" />
                                        }
                                        data={nestedItem}
                                        updateAction={
                                          expandColumn.nestedUpdateAction
                                        }
                                        actionType="edit"
                                        componentKey={
                                          expandColumn.nestedComponentKey
                                        }
                                      />
                                      <DeleteItem
                                        deleteItem={
                                          expandColumn.nestedDeleteAction
                                        }
                                        id={nestedItem.id}
                                      >
                                        <Trash className="w-4 h-4 text-red-500 hover:text-red-600" />
                                      </DeleteItem>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={tableProperties.length + 1}
                  className="text-center py-16"
                >
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Search className="w-12 h-12 mb-4 text-gray-400" />
                    <p className="text-lg font-semibold">No Results Found</p>
                    <p className="text-sm">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination Controls --- */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4">
          <div className="text-sm text-gray-700 dark:text-gray-400 mb-2 sm:mb-0">
            Showing{" "}
            <span className="font-semibold">
              {Math.min(
                (currentPage - 1) * itemsPerPage + 1,
                filteredData.length
              )}
            </span>{" "}
            to{" "}
            <span className="font-semibold">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{" "}
            of <span className="font-semibold">{filteredData.length}</span>{" "}
            results
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
      )}
    </div>
  );
}
