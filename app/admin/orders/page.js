// app/admin/order/page.js

import {
  getAllOrder,
  getOrderCount,
} from "@/backend/serverActions/orderActions";
import DynamicTable from "@/components/common/DynamicTable/";

export default async function OrderListPage() {
  const tableProperties = [
    {
      label: "",
      field: "expand",
      type: "expand",
      expandSource: "orderItems",
      expandProperties: [
        {
          label: "Thumbnail",
          field: "thumbnail",
          type: "image",
          alt: "productName",
        },
        { label: "Product Name", field: "productName", type: "text" },
        { label: "SKU", field: "sku", type: "text" },
        { label: "Price", field: "price", type: "currency" },
        { label: "Qty", field: "quantity", type: "text" },
      ],
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Order No", field: "orderNo", type: "text", sort: true },
    { label: "Customer", field: "customerName", type: "text", sort: true },
    { label: "Total Price", field: "orderPrice", type: "currency", sort: true },
    { label: "Status", field: "status", type: "badge", sort: false },
  ];

  const initialLimit = 2; // You can set your desired initial page size

  const { success, data, nextCursor, error } = await getAllOrder({
    limit: initialLimit,
    tableProperties,
    time: "ALL",
    status: "PENDING",
  });

  if (!success) return `Something went wrong: ${error}`;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Orders
      </h1>
      <DynamicTable
        // Data and Actions
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={getAllOrder}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[
          { label: "Order No", field: "orderNo" },
          { label: "SKU", field: "sku" },
          { label: "Phone Number", field: "phoneNumber" },
        ]}
        filterTagProperties={[
          { status: ["ALL", "PENDING", "SHIPPED", "DELIVERED", "CANCELED"] },
          {
            time: [
              "ALL",
              "last 24 hours",
              "last 7 days",
              "last 30 days",
              "Custom",
            ],
          },
        ]}
        filterTag={[
          {
            label: "Status",
            field: "status",
            options: [
              "ALL",
              "PENDING",
              "PACKED",
              "SHIPPED",
              "DELIVERED",
              "CANCELED",
            ],
            defaultValue: "PENDING",
          },
          {
            label: "Time",
            field: "time",
            options: [
              "ALL",
              "last 24 hours",
              "last 7 days",
              "last 30 days",
              "Custom",
            ],
            defaultValue: "ALL",
          },
        ]}
        // Pagination Properties
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
        // Actions and Links
        actionType={"edit"}
        componentKey={"OrderForm"} // Example key for a modal form
        quickViewComponentKey={"OrderQuickView"}
        viewPageURL={"/admin/order/view/"}
        getDataCount={getOrderCount}
      />
    </div>
  );
}
