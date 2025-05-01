// // components/common/DynamicTable.js

// import { Edit, Eye, Trash, View } from "lucide-react";
// import Link from "next/link";

// import ProductPageData from "@/app/(user)/product/[slug]/_components/ProductPageData";
// import Imagecustom from "../images/ImageCustom";
// import CheckBox from "../input/CheckBox";
// import SearchableDropdown from "../input/SearchableDropdown";
// import LazyModalButton from "../modal/LazyModalButton";
// import ModalButton from "../modal/ModalButton";
// import DeleteItem from "./DeleteItem";

// export default function DynamicTable({
//   data,
//   fromFields,
//   tableProperties,
//   updateAction,
//   deleteAction,
//   modelName,
//   actionType,
//   componentKey,
// }) {
//   // Check if data exists and if tableProperties is passed
//   if (!data?.length || !tableProperties) {
//     return (
//       <div>
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           width="24"
//           height="24"
//           viewBox="0 0 24 24"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth="2"
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           className="lucide lucide-inbox"
//         >
//           <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
//           <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
//         </svg>
//         <p>No data available.</p>;
//       </div>
//     );
//   }

//   // Function to render a dynamic field type based on its property
//   const renderDynamicField = (
//     { item, column },
//     prop,
//     fieldType,
//     action,
//     options
//   ) => {
//     switch (column?.type) {
//       case "image":
//         // Ensure the image is a valid URL or fallback
//         return item?.[prop] || item?.mainImage ? (
//           <Imagecustom
//             src={item?.[column?.field]?.name || item?.mainImage}
//             w={50}
//             h={50}
//             alt={item?.[column?.alt]}
//           />
//         ) : (
//           <span>No Image</span>
//         );
//       case "dropdown":
//         return (
//           // <OrderStatusUpdate
//           //   orderId={item?.id}
//           //   status={item?.[prop].id} // Assuming `status` is a string value
//           //   options={options}

//           // />
//           <SearchableDropdown
//             dropDownLists={column?.dropDownLists}
//             defaultId={item?.[column?.field]}
//             itemId={item?.id}
//           />
//         );
//       case "checkbox":
//         return (
//           <CheckBox
//             value={item?.[column?.field]}
//             action={column?.action}
//             id={item?.id}
//           />
//           //   <input
//           //     type="checkbox"
//           //     checked={item?.[prop]}
//           //     onChange={() => handleCheckboxChange(item?.id, prop)}
//           //   />
//         );
//       case "date":
//         return item?.[column?.field] ? (
//           <span>{new Date(item?.[column?.field]).toLocaleDateString()}</span>
//         ) : (
//           <span>No Date</span>
//         );
//       case "object":
//         // For category, if it's an object with a 'name' field
//         return item?.[column?.field]?.[column?.objectPropertyName] || "No data";
//       default:
//         return item?.[column?.field] ? (
//           <span>{item?.[column?.field]}</span>
//         ) : (
//           <span>No Data</span>
//         );
//     }
//   };

//   // Handle checkbox change (example for dynamic checkbox property)
//   const handleCheckboxChange = (id, prop) => {
//     console.log("Checkbox changed", id, prop);
//     // Add your logic to handle checkbox change, such as making an API call or updating state
//   };

//   return (
//     <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
//       <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
//         <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
//           <tr>
//             {/* Dynamically render table headers */}
//             {tableProperties.map((column) => (
//               <th key={column.field} scope="col" className="px-6 py-3">
//                 {column.label}
//               </th>
//             ))}
//             <th scope="col" className="px-6 py-3">
//               Actions
//             </th>
//           </tr>
//         </thead>
//         <tbody>
//           {data?.length > 0 &&
//             data.map((item) => (
//               <tr key={item?.id} className="border-b dark:border-gray-700">
//                 {/* Dynamically render table data based on tableProperties */}
//                 {tableProperties.map((column) => (
//                   <td key={column.field} className="px-6 py-4">
//                     {renderDynamicField(
//                       { item, column },
//                       column.field,
//                       column.type,
//                       column.action,
//                       column.options
//                     )}
//                   </td>
//                 ))}
//                 <td className="flex flex-row">
//                   <ModalButton
//                     buttonName={
//                       <View className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
//                     }
//                   >
//                     <ProductPageData data={item} />
//                   </ModalButton>
//                   <Link href={`/product/${encodeURIComponent(item?.slug)}`}>
//                     <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
//                   </Link>

//                   <LazyModalButton
//                     button={
//                       <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
//                     }
//                     data={item}
//                     updateAction={updateAction}
//                     actionType={actionType}
//                     componentKey={componentKey}
//                   />
//                   <DeleteItem deleteItem={deleteAction} id={item?.id}>
//                     <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
//                   </DeleteItem>
//                 </td>
//               </tr>
//             ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// components/common/DynamicTable.js

// components/common/DynamicTable.js
"use client"; // Ensure this is a client component if using hooks or state
import { motion } from "framer-motion";
import { Edit, Eye, Trash } from "lucide-react";
import Link from "next/link";
import React from "react"; // Import React for React.memo

// Components (ensure paths are correct)
import Imagecustom from "../images/ImageCustom";
import CheckBox from "../input/CheckBox";
import SearchableDropdown from "../input/SearchableDropdown";
import LazyModalButton from "../modal/LazyModalButton";
// import ModalButton from "../modal/ModalButton";
import DeleteItem from "./DeleteItem";
// import ProductPageData from "@/app/(user)/product/[slug]/_components/ProductPageData";

// --- Framer Motion Variants (defined outside component for stability) ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06, // Adjust stagger timing as needed
    },
  },
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4, // Slightly faster duration might feel more responsive
      ease: "easeOut",
    },
  },
};

// --- Helper function (can remain inside or be moved outside if preferred) ---
const renderDynamicField = (item, column) => {
  const {
    field,
    type,
    alt,
    dropDownLists,
    action,
    options,
    objectPropertyName,
  } = column;
  const value = item?.[field];

  switch (type) {
    case "image":
      const imageUrl = value?.name || item?.mainImage;
      return imageUrl ? (
        <Imagecustom
          src={imageUrl}
          w={50}
          h={50}
          alt={item?.[alt] || "Table image"}
          className="object-cover rounded"
          // Consider adding loading="lazy" if images are numerous and below the fold initially
          loading="lazy"
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
        <span>{new Date(value).toLocaleDateString()}</span>
      ) : (
        <span className="text-xs text-gray-400">No Date</span>
      );
    case "object":
      return (
        item?.[field]?.[objectPropertyName] || (
          <span className="text-xs text-gray-400">N/A</span>
        )
      );
    default: // "text" or unspecified
      return value != null ? ( // Check for null/undefined explicitly
        <span>{String(value)}</span>
      ) : (
        <span className="text-xs text-gray-400">N/A</span>
      );
  }
};

// --- The Memoized Component ---
const DynamicTable = React.memo(
  ({
    // Wrap component definition with React.memo
    data = [], // Default to empty array
    tableProperties = [], // Default to empty array
    // updateAction, // Make sure this is stable (useCallback in parent) if passed directly
    deleteAction, // Make sure this is stable (useCallback in parent)
    actionType,
    componentKey,
    updateAction,
  }) => {
    // console.log("DynamicTable rendering..."); // Add for debugging memoization

    // Check if data exists and if tableProperties is passed - moved check inside memoized component
    if (!data?.length || !tableProperties?.length) {
      return (
        <div className="flex flex-col items-center justify-center text-gray-500 p-10">
          {/* ... No data SVG and text ... */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-inbox mb-4"
          >
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
            <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
          </svg>
          <p className="text-lg">No data available.</p>
        </div>
      );
    }

    return (
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        {/* Use a standard table element, motion is applied to tbody/tr */}
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          {/* Table Head */}
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              {tableProperties.map((column) => (
                <th key={column.field} scope="col" className="px-6 py-3">
                  {column.label}
                </th>
              ))}
              <th scope="col" className="px-6 py-3 text-center">
                Actions
              </th>
            </tr>
          </thead>

          {/* Motion controlled table body */}
          <motion.tbody
            className="bg-white divide-y divide-gray-200 dark:divide-gray-700"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            // Exit animations can be added here if needed, but might impact performance on large lists
            // exit="hidden"
          >
            {data.map(
              (
                item,
                index // Keep index for fallback key
              ) => (
                <motion.tr
                  key={item?.id ?? `item-${index}`} // Prioritize stable ID, fallback to index cautiously
                  variants={itemVariants}
                  className="border-b dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-600"
                  layout // Enable smooth layout transitions (usually low cost)
                  // `initial` and `animate` are inherited from tbody
                  // `exit` can be added here for row exit animations (use with caution)
                >
                  {/* Cells */}
                  {tableProperties.map((column) => (
                    <td
                      key={`${item?.id ?? index}-${column.field}`}
                      className="px-6 py-4 align-middle"
                    >
                      {" "}
                      {/* Ensure vertical alignment */}
                      {renderDynamicField(item, column)}
                    </td>
                  ))}

                  {/* Actions Cell */}
                  <td className="px-6 py-4 flex flex-row items-center justify-center space-x-2 align-middle">
                    {/* Link to Product Page */}
                    {item?.slug && (
                      <Link
                        href={`/product/${encodeURIComponent(item.slug)}`}
                        title="View Details"
                      >
                        <Eye className="hover:text-green-500 hover:scale-105 transition cursor-pointer w-5 h-5" />
                      </Link>
                    )}
                    {/* Edit Button */}
                    <LazyModalButton
                      button={
                        <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer w-5 h-5" />
                      }
                      data={item}
                      actionType={actionType || "edit"}
                      componentKey={componentKey}
                      updateAction={updateAction}
                    />
                    {/* Delete Button */}
                    {deleteAction && ( // Conditionally render if deleteAction is provided
                      <DeleteItem
                        deleteItem={deleteAction}
                        id={item?.id}
                        itemName={item?.title || "this item"}
                      >
                        <Trash className="text-red-500 hover:text-red-700 hover:scale-105 transition cursor-pointer w-5 h-5" />
                      </DeleteItem>
                    )}
                  </td>
                </motion.tr>
              )
            )}
          </motion.tbody>
        </table>
      </div>
    );
  }
); // End of React.memo wrapper

DynamicTable.displayName = "DynamicTable"; // Add display name for better debugging

export default DynamicTable;
