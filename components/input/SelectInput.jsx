// "use client";
// import { useState } from "react";

// export default function SelectInput({
//   defaultValue,
//   name,
//   label,
//   data,

//   ...restProps
// }) {
//   const [value, setValue] = useState(defaultValue || "");
//   const handleChange = (e) => {
//     setValue(e.target.value);
//   };
//   const uniqueId = `input-${name}`;
//   return (
//     <>
//       <label
//         htmlFor={uniqueId}
//         className="cursor-pointer block mb-2 text-sm font-medium text-gray-900 dark:text-white"
//       >
//         {label}
//       </label>
//       <select
//         {...restProps}
//         defaultValue={value} // Bind the selected value to state
//         onChange={(e) => handleChange(e)}
//         name={name}
//         // id={name}
//         id={uniqueId}
//         className="cursor-pointer bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
//       >
//         <option value="" disabled>
//           Choose a Item
//         </option>
//         {data?.length > 0 &&
//           data?.map((item) => (
//             <option key={item.id} value={item?.id}>
//               {item.name}
//             </option>
//           ))}
//       </select>
//     </>
//   );
// }

"use client";
import { useEffect, useRef, useState } from "react";

export default function SelectInput({
  defaultValue,
  name,
  label,
  data,
  ...restProps
}) {
  const [selectedValue, setSelectedValue] = useState(defaultValue || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selectedItem = data.find((item) => item.id === selectedValue);
    setSearchTerm(selectedItem ? selectedItem.name : "");
  }, [selectedValue, data]);

  const handleSelect = (selectedItem) => {
    setSelectedValue(selectedItem.id);
    setSearchTerm(selectedItem.name);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (!searchTerm) {
      // যদি সার্চ টার্ম না থাকে তাহলে আগের সিলেক্ট করা আইটেম দেখাবে
      const selectedItem = data.find((item) => item.id === selectedValue);
      setSearchTerm(selectedItem ? selectedItem.name : "");
    }
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredData.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredData[highlightedIndex]) {
        handleSelect(filteredData[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        // যদি কিছু টাইপ করা না হয় তাহলে আগের সিলেক্ট করা আইটেম দেখাবে
        const selectedItem = data.find((item) => item.id === selectedValue);
        setSearchTerm(selectedItem ? selectedItem.name : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedValue, data]);

  const filteredData = searchTerm
    ? data.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : data;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label
        htmlFor={name}
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        {label}
      </label>
      <input
        {...restProps}
        ref={inputRef}
        type="text"
        name={name}
        id={name}
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={handleFocus} // এখন ফোকাস করলে আগের সিলেক্ট করা আইটেম দেখাবে
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="cursor-pointer bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      />
      {isOpen && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-md max-h-40 overflow-auto dark:bg-gray-700 dark:border-gray-600">
          {filteredData.map((item, index) => (
            <li
              key={item.id}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`p-2 cursor-pointer ${
                selectedValue === item.id
                  ? "bg-blue-500 text-white" // সিলেক্ট করা আইটেম হাইলাইটেড থাকবে
                  : index === highlightedIndex
                  ? "bg-gray-200 dark:bg-gray-600"
                  : "text-gray-900 dark:text-white"
              }`}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
