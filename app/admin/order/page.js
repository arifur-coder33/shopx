// app/admin/order/page.js

import { getAllOrder } from "@/backend/serverActions/orderActions";
import DynamicTable from "@/components/common/DynamicTable/";

export default async function OrderListPage() {
  const tableProperties = [
    {
      label: "+",
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
          label: "+",
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
    { label: "Created At", field: "createdAt", type: "date" },
    { label: "Order No", field: "orderNo", type: "text" },
    { label: "Price", field: "orderPrice", type: "currency" },
    { label: "Status", field: "status", type: "badge" },
  ];

  // Initial fetch now includes tableProperties
  const { success, data, nextCursor, error } = await getAllOrder({
    limit: 10,
    tableProperties,
  });

  if (!success) return `Something went wrong: ${error}`;
  console.log("Fetched Orders:", data);
  return (
    <div>
      <DynamicTable
        filterSearchProperties={[
          { label: "Order No", field: "orderNo" },
          { label: "Status", field: "status" },
          { label: "SKU", field: "sku" }, // SKU search is now supported!
        ]}
        filterTagProperties={[
          { status: ["delivered", "cancelled", "pending", "processing"] },
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
