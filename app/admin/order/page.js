// app/admin/order/page.js

import { getAllOrder } from "@/backend/serverActions/orderActions";
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
          label: "thumbnail",
          field: "thumbnail",
          type: "image",
          alt: "productName",
        },
        { label: "Product Name", field: "productName", type: "text" },
        { label: "SKU", field: "sku", type: "text" },
        { label: "Price", field: "price", type: "currency" },
        { label: "Qty", field: "quantity", type: "text" },
        { label: "Status", field: "status", type: "text" },
        {
          label: "",
          field: "expand",
          type: "expand",
          expandSource: "product",
          expandProperties: [
            {
              label: "thumbnail",
              field: "thumbnail",
              type: "image",
              alt: "productName",
            },
            { label: "Product Name", field: "title", type: "text" },
          ],
        },
      ],
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Order No", field: "orderNo", type: "text", sort: true },
    { label: "Price", field: "orderPrice", type: "currency", sort: true },
    { label: "Status", field: "status", type: "badge", sort: false },
  ];

  // Initial fetch now includes tableProperties
  const { success, data, nextCursor, error, meta } = await getAllOrder({
    limit: 10,
    tableProperties,
  });

  if (!success) return `Something went wrong: ${error}`;
  console.log("Fetched Orders:", meta);
  return (
    <div>
      <DynamicTable
        filterSearchProperties={[
          { label: "Order No", field: "orderNo" },
          { label: "SKU", field: "sku" },
          { label: "Phone Number", field: "phoneNumber" },
        ]}
        filterTagProperties={[
          { status: ["ALL", "DELIVERED", "CANCELED", "PENDING", "PROCESSING"] },
          { time: ["last 24 hours", "last 7 days", "last 30 days"] },
        ]}
        initialData={data}
        initialNextCursor={nextCursor} // Pass cursor instead of meta
        tableProperties={tableProperties}
        fetchAction={getAllOrder}
        // ... other props
        actionType={"edit"}
        componentKey={"ProductForm"}
        quickViewComponentKey={"OrderQuickView"}
        viewPageURL={"/admin/order/view/"}
        initialItemsPerPage={10}
      />
    </div>
  );
}
