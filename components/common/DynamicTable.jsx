// components/common/DynamicTable.js

import { Edit, Eye, Trash, View } from "lucide-react";
import Link from "next/link";

import ProductPageData from "@/app/(user)/product/[slug]/_components/ProductPageData";
import Imagecustom from "../images/ImageCustom";
import CheckBox from "../input/CheckBox";
import SearchableDropdown from "../input/SearchableDropdown";
import ModalButton from "../modal/ModalButton";
import DeleteItem from "./DeleteItem";
import DynamicForm from "./DynamicForm";

export default function DynamicTable({
  data,
  fromFields,
  tableProperties,
  updateAction,
  deleteAction,
  modelName,
}) {
  // Check if data exists and if tableProperties is passed
  if (!data?.length || !tableProperties) {
    return (
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-inbox"
        >
          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
          <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
        </svg>
        <p>No data available.</p>;
      </div>
    );
  }

  // Function to render a dynamic field type based on its property
  const renderDynamicField = (
    { item, column },
    prop,
    fieldType,
    action,
    options
  ) => {
    switch (column?.type) {
      case "image":
        // Ensure the image is a valid URL or fallback
        return item?.[prop] || item?.mainImage ? (
          <Imagecustom
            src={item?.[column?.field]?.name || item?.mainImage}
            w={50}
            h={50}
            alt={item?.[column?.alt]}
          />
        ) : (
          <span>No Image</span>
        );
      case "dropdown":
        return (
          // <OrderStatusUpdate
          //   orderId={item?.id}
          //   status={item?.[prop].id} // Assuming `status` is a string value
          //   options={options}

          // />
          <SearchableDropdown
            dropDownLists={column?.options}
            defaultId={item?.[column?.field]}
            itemId={item?.id}
          />
        );
      case "checkbox":
        return (
          <CheckBox
            value={item?.[column?.field]}
            action={column?.action}
            id={item?.id}
          />
          //   <input
          //     type="checkbox"
          //     checked={item?.[prop]}
          //     onChange={() => handleCheckboxChange(item?.id, prop)}
          //   />
        );
      case "date":
        return item?.[column?.field] ? (
          <span>{new Date(item?.[column?.field]).toLocaleDateString()}</span>
        ) : (
          <span>No Date</span>
        );
      case "category":
        // For category, if it's an object with a 'name' field
        return item?.[column?.field]?.name || "No Category";
      default:
        return item?.[column?.field] ? (
          <span>{item?.[column?.field]}</span>
        ) : (
          <span>No Data</span>
        );
    }
  };

  // Handle checkbox change (example for dynamic checkbox property)
  const handleCheckboxChange = (id, prop) => {
    console.log("Checkbox changed", id, prop);
    // Add your logic to handle checkbox change, such as making an API call or updating state
  };

  return (
    <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
      <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {/* Dynamically render table headers */}
            {tableProperties.map((column) => (
              <th key={column.field} scope="col" className="px-6 py-3">
                {column.label}
              </th>
            ))}
            <th scope="col" className="px-6 py-3">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.length > 0 &&
            data.map((item) => (
              <tr key={item?.id} className="border-b dark:border-gray-700">
                {/* Dynamically render table data based on tableProperties */}
                {tableProperties.map((column) => (
                  <td key={column.field} className="px-6 py-4">
                    {renderDynamicField(
                      { item, column },
                      column.field,
                      column.type,
                      column.action,
                      column.options
                    )}
                  </td>
                ))}
                <td className="flex flex-row">
                  <ModalButton
                    buttonName={
                      <View className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
                    }
                  >
                    <ProductPageData data={item} />
                  </ModalButton>
                  <Link href={`/product/${encodeURIComponent(item?.slug)}`}>
                    <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
                  </Link>
                  <ModalButton
                    buttonName={
                      <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
                    }
                  >
                    <DynamicForm
                      fromFields={fromFields}
                      actionType={"edit"}
                      updateAction={updateAction}
                      data={item}
                    />
                    {/* <ProductForm
                      actionType="edit"
                      category={item?.category}
                      data={item}
                    /> */}
                  </ModalButton>
                  <DeleteItem deleteItem={deleteAction} id={item?.id}>
                    <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
                  </DeleteItem>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
