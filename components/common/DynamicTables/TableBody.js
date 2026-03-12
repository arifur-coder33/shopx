"use client";

import Imagecustom from "@/components/images/ImageCustom";
import CheckBox from "@/components/input/CheckBox";
import SearchableDropdown from "@/components/input/SearchableDropdown";
import getNestedValue from "@/utils/getNestedValue";
import { ArrowDown, ArrowUp, Minus, Plus, Search } from "lucide-react";
import React from "react";
import TableActionButton from "./TableActionButton";
// --- COMPONENT IMPORTS (Ensure paths are correct) ---
const SortIcon = ({ direction }) => {
  if (direction === "asc")
    return (
      <ArrowUp className="w-3 h-3 ml-1 text-gray-600 dark:text-gray-300" />
    );
  if (direction === "desc")
    return (
      <ArrowDown className="w-3 h-3 ml-1 text-gray-600 dark:text-gray-300" />
    );
  return null; // No icon if not sorted
};

// Helper function can live here as it's only used by the TableBody
const renderDynamicField = (item, column) => {
  const {
    field,
    type,
    alt,
    dropDownLists,
    action,
    objectPropertyName,
    loadLists,
    onSelect,
    searchOff,
  } = column;
  // const value = item?.[field];
  const value = getNestedValue(item, field);
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
      console.log("dropDownLists in renderDynamicField:", dropDownLists);
      return (
        <SearchableDropdown
          isConfirm={column.isConfrim}
          dropDownLists={dropDownLists}
          defaultId={value}
          itemId={item?.id}
          loadLists={loadLists}
          onSelect={onSelect}
          searchOff={searchOff}
        />
      );
    case "checkbox":
      return <CheckBox value={!!value} action={action} id={item?.id} />;
    case "date":
      return value ? (
        <span className="whitespace-nowrap flex flex-col gap-0 leading-tight">
          <span>
            {new Date(value).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span>
            {new Date(value).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
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

export default function TableBody({
  paginatedData,
  tableProperties,
  expandedRows,
  setExpandedRows,
  sortConfig,
  onSort,
  actions,
  resource,
}) {
  const {
    getItemDataAction,
    itemUpdateFormKey,
    updateAction,
    deleteAction,
    actionType,
    viewPageURL,
    quickViewComponentKey,
    isEditabel,
  } = actions;
  const expandColumn = tableProperties.find((p) => p.type === "expand");
  const toggleRow = (id) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) newExpandedRows.delete(id);
    else newExpandedRows.add(id);
    setExpandedRows(newExpandedRows);
  };

  return (
    <div className="relative">
      <div className=" border-t border-gray-200 dark:border-gray-700 ">
        {/* Added overflow-x-auto here for horizontal scrolling */}
        <div className="overflow-x-auto">
          <table className="w-full text-[8px] md:text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className=" text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                {tableProperties.map((c) => (
                  <th key={c.field} scope="col" className="px-4 py-2">
                    {/* Adjusted padding */}
                    {/* --- HEADER CELL LOGIC --- */}
                    {c.sort ? (
                      <button
                        className="flex items-center group"
                        onClick={() => onSort(c.field)}
                      >
                        <span>{c.label}</span>
                        {sortConfig?.field === c.field ? (
                          <SortIcon direction={sortConfig?.direction} />
                        ) : (
                          // Show a faint icon on hover for non-active sort columns
                          <ArrowDown className="w-3 h-3 ml-1 text-gray-300 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </th>
                ))}
                <th
                  scope="col"
                  className="sticky bg-slate-400 right-0 px-4 py-2 text-center"
                >
                  {/* Adjusted padding for actions */}
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
                        <td
                          key={column.field}
                          className="px-4 py-2 align-middle"
                        >
                          {/* Adjusted padding */}
                          {column.type === "expand" ? (
                            <button
                              onClick={() => toggleRow(item.id)}
                              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              {expandedRows.has(item.id) ? (
                                <Minus className="w-4 h-4 text-purple-600 rounded-full ring-2 ring-purple-600" />
                              ) : (
                                <Plus className="w-4 h-4 text-purple-500 rounded-full ring-2 ring-purple-600" />
                              )}
                            </button>
                          ) : (
                            renderDynamicField(item, column)
                          )}
                        </td>
                      ))}
                      <TableActionButton
                        item={item}
                        isEditabel={isEditabel}
                        quickViewComponentKey={quickViewComponentKey}
                        itemUpdateFormKey={itemUpdateFormKey}
                        updateAction={updateAction}
                        deleteAction={deleteAction}
                        resource={resource}
                      />
                    </tr>
                    {/* --- EXPANDED ROW WITH NESTED TABLE --- */}
                    {expandColumn && (
                      <tr className="bg-white dark:bg-gray-800">
                        <td
                          colSpan={tableProperties.length + 1}
                          className="p-0"
                        >
                          <div
                            className={`overflow-hidden transition-[max-height] duration-500 ease-in-out ${
                              expandedRows.has(item.id)
                                ? "max-h-[1000px]"
                                : "max-h-0"
                            }`}
                          >
                            <div className="bg-slate-100 shadow-inner shadow-black rounded-xl dark:bg-gray-800/50 p-2 ">
                              <table className=" w-full text-sm text-left text-gray-500 dark:text-gray-400 rounded-lg overflow-hidden">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
                                  <tr>
                                    {expandColumn.expandProperties.map(
                                      (prop) => (
                                        <th
                                          key={prop.field}
                                          className="px-4 py-2"
                                        >
                                          {prop.label}
                                        </th>
                                      ),
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {item[expandColumn.expandSource]?.map(
                                    (nestedItem) => (
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
                                              {renderDynamicField(
                                                nestedItem,
                                                prop,
                                              )}
                                            </td>
                                          ),
                                        )}
                                      </tr>
                                    ),
                                  )}
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
      </div>
    </div>
  );
}
