// "use client";
// import { useEffect, useRef, useState } from "react";
// import LazyModalButton from "../modal/LazyModalButton";

// import { useModalContext } from "@/context/ModalContext";

// export default function SearchableDropdown({
//   name,
//   defaultId,
//   label,
//   addForm, /// Add form to open when no results found
//   dropDownLists = [],
//   loadLists, // Function to load dropdown lists
//   onSelect = () => {}, //
//   index, //the index from dropdown component if it map as array
//   colSpan, // Width of the dropdown
//   searchOff = false, // Disable search functionality
// }) {
//   const { modalClosed, setModalClosed } = useModalContext();
//   const [query, setQuery] = useState("");
//   const [selected, setSelected] = useState(null);
//   const [isOpen, setIsOpen] = useState(false);
//   const [dropdownPosition, setDropdownPosition] = useState("bottom");
//   const [fetchedDropDownList, setFetchedDropDownList] = useState([]);
//   const dropdownRef = useRef(null);
//   const [loading, setLoading] = useState(false);

//   // Set default selection based on ID

//   useEffect(() => {
//     if (defaultId?.id) {
//       setSelected(defaultId);
//     } else {
//       setSelected(null);
//     }
//   }, [defaultId]);

//   useEffect(() => {
//     if (dropDownLists?.length > 0) {
//       setFetchedDropDownList(dropDownLists);
//     }
//   }, [dropDownLists]);

//   useEffect(() => {
//     if (typeof loadLists === "function" && modalClosed) {
//       loadLists(); // re-fetch on modal close
//     }
//     setQuery(""); // Clear query when modal closes
//     setModalClosed(false); // Reset modalClosed state after fetching
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [modalClosed]);

//   const handleFocus = async () => {
//     if (fetchedDropDownList.length === 0 && dropDownLists.length === 0) {
//       // const loaded = await dropDownLists();
//       // setFetchedDropDownList(loaded);
//       console.log("Loading dropdown lists on focus");
//       if (loadLists) {
//         setLoading(true);
//         const data = await loadLists();
//         console.log("Fetched Data:", data);
//         setFetchedDropDownList(data?.data || []);
//         setLoading(false);
//       }
//     }
//     setIsOpen(true);
//   };

//   const filteredOptions =
//     query === ""
//       ? fetchedDropDownList
//       : fetchedDropDownList.filter((item) =>
//           item.name.toLowerCase().includes(query.toLowerCase()),
//         );

//   // Handle outside click to close dropdown
//   useEffect(() => {
//     function handleClickOutside(event) {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setIsOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // Dynamically set dropdown position
//   useEffect(() => {
//     if (!isOpen) return;

//     const rect = dropdownRef.current.getBoundingClientRect();
//     const screenHeight = window.innerHeight;
//     const screenWidth = window.innerWidth;

//     if (rect.bottom + 150 > screenHeight) {
//       setDropdownPosition("top");
//     } else {
//       setDropdownPosition("bottom");
//     }

//     if (rect.left < 150) {
//       setDropdownPosition("right");
//     } else if (rect.right > screenWidth - 150) {
//       setDropdownPosition("left");
//     }
//   }, [isOpen]);

//   return (
//     <div className={`relative col-span-${colSpan} `} ref={dropdownRef}>
//       <label
//         // htmlFor={uniqueId}
//         className="cursor-pointer block mb-2 text-sm font-medium text-gray-900 dark:text-white"
//       >
//         {label}
//       </label>
//       {/* Input Field */}
//       <input
//         hidden
//         name={name}
//         type="text"
//         defaultValue={selected?.id || ""}
//         readOnly
//       />
//       <div className="relative ">
//         {" "}
//         <input
//           type="text"
//           className="z-10 w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 "
//           autoComplete="new-password"
//           placeholder={
//             loading
//               ? "Loading..."
//               : selected
//                 ? selected.name
//                 : "Select an option"
//           }
//           value={
//             loading ? "Loading..." : query || (selected ? selected.name : "")
//           }
//           onChange={(e) => {
//             setQuery(e.target.value);
//             setSelected(null); // Optional: clear selected when typing
//           }}
//           onFocus={handleFocus}
//           readOnly={searchOff || fetchedDropDownList?.length === 0} // Make readonly if no options
//         />
//         {/* Anchor Button (Click to Show Full List) */}
//         <button
//           type="button"
//           className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
//           onClick={() => fetchedDropDownList?.length > 0 && setIsOpen(!isOpen)} // Toggle dropdown only if options exist
//           disabled={fetchedDropDownList?.length === 0}
//         >
//           ▼
//         </button>
//       </div>

//       {/* Dropdown List */}
//       {isOpen && fetchedDropDownList?.length > 0 && (
//         <ul
//           className={`z-50 absolute w-full border p-2 border-gray-300 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-md shadow-md shadow-slate-900 dark:shadow-slate-100  max-h-40  ${
//             dropdownPosition === "bottom" ? "top-full mt-1" : ""
//           } ${dropdownPosition === "top" ? "bottom-full mb-1" : ""} ${
//             dropdownPosition === "left" ? "right-0" : ""
//           } ${dropdownPosition === "right" ? "left-0" : ""}`}
//         >
//           {filteredOptions.length > 0 ? (
//             filteredOptions.map((item, idex) => (
//               <li
//                 key={item.id}
//                 className={`cursor-pointer px-3 py-2 ${
//                   selected?.id === item.id
//                     ? "bg-blue-500 text-white"
//                     : "hover:bg-blue-500 hover:text-white"
//                 }`}
//                 onClick={() => {
//                   setSelected(item);
//                   setQuery(""); // Clear query but keep selection
//                   setIsOpen(false); // Close dropdown
//                   if (typeof onSelect === "function") {
//                     onSelect(item, index);
//                   } else {
//                     console.warn("onSelect is not a function", onSelect);
//                   }
//                 }}
//               >
//                 {item.name}
//               </li>
//             ))
//           ) : (
//             <>
//               <li className="px-3 py-2 text-gray-500">
//                 No results found {addForm}
//               </li>
//               {addForm && (
//                 <li className="px-3 py-2 text-gray-200 bg-blue-500">
//                   <LazyModalButton componentKey={addForm} />
//                 </li>
//               )}
//             </>
//           )}
//         </ul>
//       )}
//     </div>
//   );
// }
"use client";

import { useModalContext } from "@/context/ModalContext";
import { ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import LazyModalButton from "../modal/LazyModalButton";
import { confirmFromUser } from "../modal/confrim/confirm";

const colSpanClasses = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  full: "col-span-full",
};

export default function SearchableDropdown({
  name,
  label,
  placeholder,
  defaultId,
  addForm,
  dropDownLists = [],
  loadLists,
  searchOptions,
  onSelect = () => {},
  index,
  colSpan = 1,
  searchOff = false,
  itemId,
  isConfirm = false,
  required = false,
  disabled = false,
  largeMobile = false,
  addFormData,
  onClear,
}) {
  const { modalClosed, setModalClosed } = useModalContext();
  const generatedId = useId();
  const inputId = `${name || "searchable-dropdown"}-${generatedId}`;

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [list, setList] = useState([]);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const [remoteResult, setRemoteResult] = useState(null);
  const [activeOptionIndex, setActiveOptionIndex] = useState(-1);
  const searchTerm = query.trim();
  const listId = `${inputId}-list`;

  useEffect(() => {
    if (!searchOptions || !isOpen || searchTerm.length < 2) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const options = await searchOptions(searchTerm);
        if (active) setRemoteResult({ term: searchTerm, options });
      } catch {
        if (active) setRemoteResult({ term: searchTerm, options: [], failed: true });
      }
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [isOpen, searchOptions, searchTerm]);

  /* ---------------- Default value ---------------- */
  useEffect(() => {
    if (defaultId?.id) {
      setSelected(defaultId);
    } else {
      setSelected(null);
      setQuery("");
    }
  }, [defaultId]);

  /* ---------------- Sync list ---------------- */
  useEffect(() => {
    if (dropDownLists?.length) {
      setList(dropDownLists);
    }
  }, [dropDownLists]);

  /* ---------------- Reload after modal close ---------------- */
  useEffect(() => {
    if (modalClosed && typeof loadLists === "function") {
      loadLists().then((res) => setList(res?.data || []));
      setModalClosed(false);
    }
  }, [modalClosed, loadLists, setModalClosed]);

  /* ---------------- Filter (fast) ---------------- */
  const localOptions = useMemo(() => {
    if (!query) return list;
    const normalizedQuery = query.toLocaleLowerCase();
    return list.filter((item) =>
      [item.name, item.searchText, item.id]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, list]);
  const hasRemoteResult = searchTerm.length >= 2 && remoteResult?.term === searchTerm;
  const filteredOptions = searchOptions ? (hasRemoteResult ? remoteResult.options : []) : localOptions;
  const emptyMessage = !searchOptions ? "No results found"
    : searchTerm.length < 2 ? "নাম বা SKU-এর অন্তত ২টি অক্ষর লিখুন"
    : !hasRemoteResult ? "খোঁজা হচ্ছে…"
    : remoteResult.failed ? "সার্চ করা যায়নি। আবার চেষ্টা করুন।"
    : "কোনো component পাওয়া যায়নি";

  /* ---------------- Open dropdown ---------------- */
  const openDropdown = async () => {
    if (!list.length && loadLists) {
      setLoading(true);
      const res = await loadLists();
      setList(res?.data || []);
      setLoading(false);
    }
    setIsOpen(true);
  };

  /* ---------------- Calculate position ---------------- */
  useEffect(() => {
    if (!isOpen || !inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const height = 180;

    let top = rect.bottom;
    if (rect.bottom + height > window.innerHeight) {
      top = rect.top - height;
    }

    setDropdownStyle({
      position: "fixed",
      top,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [isOpen]);

  /* ---------------- Outside click (PORTAL SAFE) ---------------- */
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (
        wrapperRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, []);

  /* ---------------- Select ---------------- */
  const handleSelect = async (item) => {
    if (!isConfirm) {
      setSelected(item);
      setQuery("");
      setIsOpen(false);
      await onSelect(item, itemId, index);
      return;
    }
    const ok = await confirmFromUser({
      title: "Change Confirmation",
      message: "Are you sure you want to change?",
    });
    if (!ok) return;
    setSelected(item);
    setQuery("");
    setIsOpen(false);
    const res = await onSelect(item, itemId, index);

    if (res?.success) {
      toast.success(" updated successfully");
    }
    if (!res.success) {
      toast.error(res?.message || "Failed to update ");
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative ${colSpanClasses[colSpan] || colSpanClasses[1]}`}
    >
      {/* Hidden input (form support) */}
      <input hidden name={name} value={selected?.id || ""} readOnly />

      {/* Input */}
      <div className="relative">
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role={searchOptions ? "combobox" : undefined}
          aria-autocomplete={searchOptions ? "list" : undefined}
          aria-controls={searchOptions && isOpen ? listId : undefined}
          aria-expanded={searchOptions ? isOpen : undefined}
          aria-activedescendant={searchOptions && isOpen && filteredOptions[activeOptionIndex] ? `${listId}-${activeOptionIndex}` : undefined}
          value={loading ? "Loading..." : query || selected?.name || ""}
          placeholder={label ? " " : placeholder || "Select an option"}
          readOnly={searchOff}
          onFocus={openDropdown}
          required={required}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            if (searchOptions) {
              if (e.target.value.trim() !== searchTerm) setRemoteResult(null);
              setActiveOptionIndex(-1);
              setIsOpen(true);
            }
            onClear?.();
          }}
          onKeyDown={searchOptions ? (event) => {
            if (event.key === "Escape" && isOpen) {
              event.stopPropagation();
              setIsOpen(false);
              setActiveOptionIndex(-1);
            }
            if (["ArrowDown", "ArrowUp"].includes(event.key)) {
              event.preventDefault();
              setIsOpen(true);
              if (filteredOptions.length) setActiveOptionIndex((current) => {
                if (event.key === "ArrowDown") return (current + 1) % filteredOptions.length;
                return current <= 0 ? filteredOptions.length - 1 : current - 1;
              });
            }
            if (event.key === "Enter") {
              event.preventDefault();
              const option = filteredOptions[activeOptionIndex] || (filteredOptions.length === 1 ? filteredOptions[0] : null);
              if (isOpen && option) {
                handleSelect(option);
                setActiveOptionIndex(-1);
              } else setIsOpen(true);
            }
          } : undefined}
          className={`peer block h-12 w-full appearance-none rounded-lg border border-gray-300 bg-slate-200 px-2.5 pr-11 ${largeMobile ? "text-xl md:text-lg" : "text-lg"} text-gray-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-slate-600 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-500
              user-invalid:border-red-500
            user-invalid:blink-border
              user-invalid:border-2
    user-invalid:focus:border-red-500
    user-invalid:focus:ring-red-500
          `}
        />

        {label && (
          <label
            htmlFor={inputId}
            className={`pointer-events-none absolute start-1 top-2 z-10 origin-[0] -translate-y-4 scale-75 rounded-md bg-slate-200 px-2 ${largeMobile ? "text-xl md:text-lg" : "text-lg"} font-medium text-slate-500 duration-300 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:scale-100 peer-focus:top-2 peer-focus:-translate-y-4 peer-focus:scale-75 peer-focus:px-2 peer-focus:text-blue-600 dark:bg-slate-600 dark:text-gray-400 peer-focus:dark:text-slate-200`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}

        <button
          type="button"
          disabled={disabled}
          aria-label={`${label || "Option"} তালিকা ${isOpen ? "বন্ধ" : "খুলুন"}`}
          aria-expanded={isOpen}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
              return;
            }
            inputRef.current?.focus();
            if (searchOptions) setIsOpen(true);
          }}
          className="absolute inset-y-0 right-1 flex w-10 items-center justify-center rounded-r-lg text-slate-500 transition-colors hover:text-blue-600 dark:text-gray-300"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* ---------------- Dropdown (PORTAL) ---------------- */}
      {isOpen &&
        dropdownStyle &&
        createPortal(
          <ul
            ref={dropdownRef}
            id={searchOptions ? listId : undefined}
            role={searchOptions ? "listbox" : undefined}
            style={dropdownStyle}
            className="max-h-44 overflow-y-auto rounded-md border text-base
            bg-slate-100 dark:bg-slate-900
            text-slate-700 dark:text-slate-300
            shadow-lg"
          >
            {filteredOptions.length ? (
              filteredOptions.map((item, optionIndex) => (
                <li
                  key={item.id}
                  id={searchOptions ? `${listId}-${optionIndex}` : undefined}
                  role={searchOptions ? "option" : undefined}
                  aria-selected={searchOptions ? selected?.id === item.id : undefined}
                  onMouseDown={(e) => {
                    e.preventDefault(); // 🔥 important
                    handleSelect(item);
                  }}
                  className={`px-3 py-2 cursor-pointer
                  ${
                    selected?.id === item.id || (searchOptions && optionIndex === activeOptionIndex)
                      ? "bg-blue-500 text-white"
                      : "hover:bg-blue-500 hover:text-white"
                  }`}
                >
                  {item.name}
                </li>
              ))
            ) : (
              <>
                <li className="px-3 py-2 text-gray-500">{emptyMessage}</li>
                {addForm && (
                  <li className="px-3 py-2 bg-blue-500 text-white">
                    <LazyModalButton
                      componentKey={addForm}
                      data={{ ...addFormData, name: query }}
                    />
                  </li>
                )}
              </>
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}
