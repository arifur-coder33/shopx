// export const dynamic = "force-static";

import { getAllOrder } from "@/backend/serverActions/orderActions";
import DynamicTable from "@/components/common/DynamicTable/";

export default async function ProductListPage() {
  const { success, data, error } = await getAllOrder();

  if (!success) {
    return "Some thing went wrong";
  }

  if (success && data.length === 0) {
    return "No order received Yet.";
  }
  const tableProperties = [
    {
      label: "+",
      field: "expand",
      type: "expand",
      field: "orderItems",

      expandProperties: [
        { label: "Product Name", field: "productName", type: "text" },
        { label: "Price", field: "price", type: "text" }, // Consider adding currency formatting    }
        { label: "qty", field: "quantity", type: "text" },
        { label: "status", field: "status", type: "text" },
        {
          label: "thumbnail",
          field: "thumbnail",
          type: "image",
          alt: "productName",
        }, // Ensure 'thumbnail' has 'name' property if type is 'image' expects it
      ],
    },
    { label: "Created At", field: "createdAt", type: "date" },
    { label: "Order No", field: "orderNo", type: "text" },

    { label: "Price", field: "orderPrice", type: "text" }, // Consider adding currency formatting
    { label: "status", field: "status", type: "text" },
  ];
  console.log("Order Data:", data);
  return (
    <div>
      <DynamicTable
        filterSearchProperties={[
          { label: "Order No", field: "orderNo" },
          { label: "Status", field: "status" },
        ]}
        // This remains the same
        filterTagProperties={[
          { status: ["delivered", "cancelled", "pending", "processing"] },
          { time: ["last 24 hours", "last 7 days", "last 30 days"] },
        ]}
        data={data} // Pass the combined data
        tableProperties={tableProperties}
        // updateAction={updateProductAction} // Define update action
        // deleteAction={deleteProductById} // Define delete action
        actionType={"edit"}
        componentKey={"ProductForm"}
        quickViewComponentKey={"OrderQuickView"}
        viewPageURL={"/admin/order/view/"}
        initialItemsPerPage={25}
      />
    </div>
  );
}
