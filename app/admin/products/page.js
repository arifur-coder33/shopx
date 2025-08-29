import {
  getProductCount,
  getProducts,
} from "@/backend/serverActions/productActions";
import DynamicTable from "@/components/common/DynamicTable/";
export default async function ProductListPage() {
  const tableProperties = [
    {
      label: "Thumbnail",
      field: "thumbnail",
      type: "image",
      alt: "productName",
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Name", field: "title", type: "text", sort: true },
    { label: "price", field: "discountPrice", type: "text", sort: true },

    { label: "Qty", field: "quantity", type: "text" },
    { label: "Status", field: "isActive", type: "badge", sort: false },
  ];

  const initialLimit = 2; // You can set your desired initial page size

  const { success, data, nextCursor, error } = await getProducts({
    limit: initialLimit,
    tableProperties,
    isActive: true,
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
        fetchAction={getProducts}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[
          { label: "Name", field: "title" },
          { label: "SKU", field: "sku" },
        ]}
        // filterTagProperties={[
        //   { status: ["ALL", "PENDING", "SHIPPED", "DELIVERED", "CANCELED"] },
        //   {
        //     time: [
        //       "ALL",
        //       "last 24 hours",
        //       "last 7 days",
        //       "last 30 days",
        //       "Custom",
        //     ],
        //   },
        // ]}
        filterTagProperties={[
          {
            label: "Status",
            field: "status",
            options: ["ALL", "ACTIVE", "INACTIVE", "DRAFT", "DELETED"],
            defaultValue: "ACTIVE",
          },
        ]}
        // Pagination Properties
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
        // Actions and Links
        actionType={"edit"}
        componentKey={"ProductForm"} // Example key for a modal form
        quickViewComponentKey={"OrderQuickView"}
        viewPageURL={"/admin/product/view/"}
        getDataCount={getProductCount}
      />
    </div>
  );
}
