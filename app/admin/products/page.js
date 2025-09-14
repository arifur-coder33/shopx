import {
  getAllProduct,
  getProductCount,
} from "@/backend/serverActions/productActions";
import DynamicTable from "@/components/common/DynamicTable/";
export default async function ProductListPage() {
  const tableProperties = [
    {
      label: "Thumbnail",
      field: "thumbnail", // Access the URL of the thumbnail Media
      type: "image",
      alt: "title", // Use product title as alt text
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Name", field: "title", type: "text", sort: true },

    {
      label: "Category",
      field: "category.name",
      type: "text",
      sort: false, // Assuming category name is not directly sortable on product table
    },

    {
      label: "price",
      field: "price",
      type: "text",
      sort: false, // Assuming category name is not directly sortable on product table
    },
    {
      label: "stock",
      field: "stock",
      type: "text",
      sort: false, // Assuming category name is not directly sortable on product table
    },

    { label: "Status", field: "status", type: "badge", sort: true }, // Use 'status' enum directly
  ];

  const initialLimit = 5; // You can set your desired initial page size

  const { success, data, nextCursor, error } = await getAllProduct({
    limit: initialLimit,
    tableProperties,
    status: "ACTIVE", // Filter by active products by default
  });

  if (!success) return `Something went wrong: ${error}`;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
        Products
      </h1>
      <DynamicTable
        // Data and Actions
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={getAllProduct}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[
          { label: "Name", field: "title" },
          { label: "Product Code", field: "productCode" }, // Add productCode filter
        ]}
        filterTagProperties={[
          {
            label: "Status",
            field: "status",
            options: ["ALL", "ACTIVE", "INACTIVE", "DRAFT", "DELETED"],
            defaultValue: "ACTIVE",
          },
          {
            label: "stock",
            field: "stock",
            options: ["ALL", "IN STOCK", "OUT STOCK", "LESS STOCK"],
            defaultValue: "ALL",
          },
        ]}
        // Pagination Properties
        initialItemsPerPage={initialLimit}
        itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
        // Actions and Links
        actionType={"edit"}
        componentKey={"ProductForm"} // Example key for a modal form
        quickViewComponentKey={"ProductQuickView"} // Assuming you'll create one
        viewPageURL={"/admin/product/view/"}
        getDataCount={getProductCount} // Ensure getProductCount is updated too
      />
    </div>
  );
}
