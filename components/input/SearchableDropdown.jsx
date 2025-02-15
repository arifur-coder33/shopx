"use client";
import { useState, useEffect, useRef } from "react";

export default function SearchableDropdown({ name, options = [], defaultId ,label}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState("bottom");
  const dropdownRef = useRef(null);

  // Set default selection based on ID
  useEffect(() => {
    if (defaultId && options.length > 0) {
      const defaultItem = options.find((item) => item.id === defaultId);
      setSelected(defaultItem || null);
    }
  }, [defaultId, options]);

  const filteredOptions =
    query === ""
      ? options
      : options.filter((item) =>
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
    <div className="relative w-64" ref={dropdownRef}>
           <label
        // htmlFor={uniqueId}
        className="cursor-pointer block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >{label} </label>
      {/* Input Field */}
      <div className="relative">
   
        <input
          type="text"
          className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={selected ? selected.name : "Select an option"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          readOnly={options.length === 0} // Make readonly if no options
        />
        {/* Anchor Button (Click to Show Full List) */}
        <button
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
          onClick={() => options.length > 0 && setIsOpen(!isOpen)} // Toggle dropdown only if options exist
          disabled={options.length === 0}
        >
          ▼
        </button>
      </div>

      {/* Dropdown List */}
      {isOpen && options.length > 0 && (
        <ul
          className={`absolute w-full border border-gray-300 bg-white rounded-md shadow-md z-10 max-h-40 overflow-auto ${
            dropdownPosition === "bottom" ? "top-full mt-1" : ""
          } ${dropdownPosition === "top" ? "bottom-full mb-1" : ""} ${
            dropdownPosition === "left" ? "right-0" : ""
          } ${dropdownPosition === "right" ? "left-0" : ""}`}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((item) => (
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
                }}
              >
                {item.name}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-gray-500">No results found</li>
          )}
        </ul>
      )}
    </div>
  );
}
