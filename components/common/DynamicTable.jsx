// components/common/DynamicTable.js

import { Edit, Eye, Trash, View } from "lucide-react";
import Link from "next/link";

import ProductPageData from "@/app/(user)/product/[slug]/_components/ProductPageData";
import { deleteProductById } from "@/backend/serverActions/productActions";
import Imagecustom from "../images/ImageCustom";
import CheckBox from "../input/CheckBox";
import ModalButton from "../modal/ModalButton";
import OrderStatusUpdate from "../orders/OrderStatusUpdate";
import ProductForm from "../products/ProductForm";
import DeleteItem from "./DeleteItem";

export default function DynamicTable({ data, tableProperties }) {
  // Check if data exists and if tableProperties is passed
  if (!data?.length || !tableProperties) {
    return <p>No products available.</p>;
  }

  // Function to render a dynamic field type based on its property
  const renderDynamicField = (item, prop, fieldType, action) => {
    switch (fieldType) {
      case "image":
        // Ensure the image is a valid URL or fallback
        return item?.[prop] ? (
          <Imagecustom src={item?.[prop]} w={50} h={50} alt={item?.title} />
        ) : (
          <span>No Image</span>
        );
      case "dropdown":
        return (
          <OrderStatusUpdate
            orderId={item?.id}
            status={item?.[prop]} // Assuming `status` is a string value
          />
        );
      case "checkbox":
        return (
          <CheckBox value={item?.[prop]} action={action} id={item?.id} />
          //   <input
          //     type="checkbox"
          //     checked={item?.[prop]}
          //     onChange={() => handleCheckboxChange(item?.id, prop)}
          //   />
        );
      case "date":
        return item?.[prop] ? (
          <span>{new Date(item?.[prop]).toLocaleDateString()}</span>
        ) : (
          <span>No Date</span>
        );
      case "category":
        // For category, if it's an object with a 'name' field
        return item?.[prop]?.name || "No Category";
      default:
        return item?.[prop] ? (
          <span>{item?.[prop]}</span>
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
                      item,
                      column.field,
                      column.type,
                      column.action
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
                    <ProductForm
                      actionType="edit"
                      category={item?.category}
                      data={item}
                    />
                  </ModalButton>
                  <DeleteItem deleteItem={deleteProductById} id={item?.id}>
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
