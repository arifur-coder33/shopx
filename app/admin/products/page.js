// export const revalidate = 60;
// export const dynamic = "force-static";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

import { auth } from "@/auth";
import {
  deleteProductById,
  getAllProduct,
  getProductCount,
  updateProductAction,
} from "@/backend/serverActions/productActions";
import DynamicTable from "@/components/common/DynamicTables/Index";
export default async function ProductListPage() {
  const tableProperties = [
    {
      label: "",
      field: "expand",
      type: "expand",
      expandSource: "variations",
      expandProperties: [
        {
          label: "Thumbnail",
          field: "thumbnail",
          type: "image",
          alt: "productName",
        },

        { label: "SKU", field: "sku", type: "text" },
        { label: " Price", field: "price", type: "currency" },
        { label: " Orders", field: "orders", type: "currency" },
        { label: "Stock", field: "stock", type: "text" },
      ],
    },
    {
      label: "Thumbnail",
      field: "thumbnail", // Access the URL of the thumbnail Media
      type: "image",
      alt: "title", // Use product title as alt text
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Name", field: "title", type: "text", sort: true },
    { label: "Product Code", field: "productCode", type: "text", sort: true },

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
      sort: true,
    },
    {
      label: "stock",
      field: "stock",
      type: "number",
      sort: true,
    },
    {
      label: "Orders",
      field: "orders",
      type: "number",
      sort: true,
    },
    { label: "Views", field: "viewCount", type: "number", sort: true },
    { label: "Reviews", field: "reviewCount", type: "computed", sort: false },
    { label: "Avg. rating", field: "reviewRating", type: "computed", sort: false },

    { label: "Status", field: "status", type: "badge", sort: true }, // Use 'status' enum directly
  ];

  const initialLimit = 5; // You can set your desired initial page size

  const { success, data, nextCursor, error } = await getAllProduct({
    limit: initialLimit,
    tableProperties,
    status: "ACTIVE", // Filter by active products by default
  });

  if (!success) return `Something went wrong: ${error}`;

  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "product", "view")) {
    return <div>Unauthorized</div>;
  }
  return (
    <div className="p-4">
      <DynamicTable
        // Data and Actions
        resource={"product"}
        initialData={data}
        initialNextCursor={nextCursor}
        fetchAction={getAllProduct}
        tableProperties={tableProperties}
        // Filtering Properties
        filterSearchProperties={[
          { label: "Name", field: "title" },
          { label: "Category", field: "name" },
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
        tableName={"Product List"}
        // Assuming you'll create one
        viewPageURL={"/admin/product/view/"}
        getDataCount={getProductCount} // Ensure getProductCount is updated too
        actions={{
          getItemDataAction: "",
          itemAddFormKey: "ProductForm",
          itemUpdateFormKey: "ProductForm",
          quickViewComponentKey: "ProductQuickView",
          updateAction: updateProductAction,
          deleteAction: deleteProductById,
          isEditabel: true,
          viewPageURL: "/admin/product/view/",
        }}
      />
    </div>
  );
}
