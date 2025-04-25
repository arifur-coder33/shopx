"use client";
import { useEffect, useRef, useState } from "react";
import LazyModalButton from "../modal/LazyModalButton";

import { useModalContext } from "@/context/ModalContext";

export default function SearchableDropdown({
  name,
  defaultId,
  label,
  addForm, /// Add form to open when no results found
  dropDownLists,
  loadLists, // Function to load dropdown lists
  onSelect, //
  index, //the index from dropdown component if it map as array
}) {
  const { closeModal } = useModalContext();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");
  const [fetchedDropDownList, setFetchedDropDownList] = useState([]);
  const dropdownRef = useRef(null);

  // Set default selection based on ID

  useEffect(() => {
    if (defaultId?.id) {
      setSelected(defaultId);
    } else {
      setSelected(null);
    }
  }, [defaultId]);

  useEffect(() => {
    if (dropDownLists?.length > 0) {
      setFetchedDropDownList(dropDownLists);
    }
  }, [dropDownLists]);

  useEffect(() => {
    if (typeof loadLists === "function" && closeModal) {
      loadLists(); // re-fetch on modal close
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeModal]);

  const handleFocus = async () => {
    if (fetchedDropDownList.length === 0 && dropDownLists.length === 0) {
      // const loaded = await dropDownLists();
      // setFetchedDropDownList(loaded);
      if (loadLists) {
        await loadLists();
      }
    }
    setIsOpen(true);
  };

  const filteredOptions =
    query === ""
      ? fetchedDropDownList
      : fetchedDropDownList.filter((item) =>
          item.name.toLowerCase().includes(query.toLowerCase())
        );

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamically set dropdown position
  useEffect(() => {
    if (!isOpen) return;

    const rect = dropdownRef.current.getBoundingClientRect();
    const screenHeight = window.innerHeight;
    const screenWidth = window.innerWidth;

    if (rect.bottom + 150 > screenHeight) {
      setDropdownPosition("top");
    } else {
      setDropdownPosition("bottom");
    }

    if (rect.left < 150) {
      setDropdownPosition("right");
    } else if (rect.right > screenWidth - 150) {
      setDropdownPosition("left");
    }
  }, [isOpen]);

  return (
    <div className="relative w-64 " ref={dropdownRef}>
      <label
        // htmlFor={uniqueId}
        className="cursor-pointer block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        {label}
      </label>
      {/* Input Field */}
      <input
        hidden
        name={name}
        type="text"
        defaultValue={selected?.id || ""}
        readOnly
      />
      <div className="relative ">
        <input
          type="text"
          className="z-10 w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 "
          placeholder={selected ? selected.name : "Select an option"}
          value={query || (selected ? selected.name : "")}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null); // Optional: clear selected when typing
          }}
          onFocus={handleFocus}
          readOnly={fetchedDropDownList.length === 0} // Make readonly if no options
        />
        {/* Anchor Button (Click to Show Full List) */}
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          onClick={() => fetchedDropDownList.length > 0 && setIsOpen(!isOpen)} // Toggle dropdown only if options exist
          disabled={fetchedDropDownList.length === 0}
        >
          ▼
        </button>
      </div>

      {/* Dropdown List */}
      {isOpen && fetchedDropDownList.length > 0 && (
        <ul
          className={`z-20 absolute w-full borde p-2 border-gray-300 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md shadow-md shadow-slate-900 dark:shadow-slate-100  max-h-40 overflow-auto ${
            dropdownPosition === "bottom" ? "top-full mt-1" : ""
          } ${dropdownPosition === "top" ? "bottom-full mb-1" : ""} ${
            dropdownPosition === "left" ? "right-0" : ""
          } ${dropdownPosition === "right" ? "left-0" : ""}`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item, idex) => (
              <li
                key={item.id}
                className={`cursor-pointer px-3 py-2 ${
                  selected?.id === item.id
                    ? "bg-blue-500 text-white"
                    : "hover:bg-blue-500 hover:text-white"
                }`}
                onClick={() => {
                  setSelected(item);
                  setQuery(""); // Clear query but keep selection
                  setIsOpen(false); // Close dropdown
                  onSelect && onSelect(item, index); // Call onSelect if provided
                }}
              >
                {item.name}
              </li>
            ))
          ) : (
            <>
              <li className="px-3 py-2 text-gray-500">No results found</li>
              {addForm && (
                <li className="px-3 py-2 text-gray-200 bg-blue-500">
                  <LazyModalButton componentKey={addForm} />
                </li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}
