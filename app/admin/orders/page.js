// // app/admin/order/page.js

// export const dynamic = "force-static";
// import {
//   deleteOrderById,
//   getAllOrder,
//   getOrderCount,
// } from "@/backend/serverActions/orderActions";
// import DynamicTable from "@/components/common/DynamicTables/Index";

// export default async function OrderListPage() {
//   const tableProperties = [
//     {
//       label: "",
//       field: "expand",
//       type: "expand",
//       expandSource: "orderItems",
//       expandProperties: [
//         {
//           label: "Thumbnail",
//           field: "thumbnail",
//           type: "image",
//           alt: "productName",
//         },
//         { label: "Product Name", field: "productName", type: "text" },
//         { label: "SKU", field: "sku", type: "text" },
//         { label: "Price", field: "price", type: "currency" },
//         { label: "Qty", field: "quantity", type: "text" },
//       ],
//     },
//     { label: "Created At", field: "createdAt", type: "date", sort: true },
//     { label: "Order No", field: "orderNo", type: "text", sort: true },
//     { label: "Customer", field: "customerName", type: "text", sort: true },
//     { label: "Total Price", field: "orderPrice", type: "currency", sort: true },
//     { label: "Status", field: "status", type: "badge", sort: false },
//   ];

//   const initialLimit = 5;

//   const { success, data, nextCursor, error } = await getAllOrder({
//     limit: initialLimit,
//     tableProperties,
//     time: "ALL",
//     status: "PENDING",
//   });

//   if (!success) return `Something went wrong: ${error}`;

//   return (
//     <div className="p-4">
//       <DynamicTable
//         // Data and Actions
//         tableName={"Order List"}
//         initialData={data}
//         initialNextCursor={nextCursor}
//         fetchAction={getAllOrder}
//         tableProperties={tableProperties}
//         // Filtering Properties
//         filterSearchProperties={[
//           { label: "Order No", field: "orderNo" },
//           { label: "SKU", field: "sku" },
//           { label: "Phone Number", field: "phoneNumber" },
//         ]}
//         filterTagProperties={[
//           {
//             label: "Status",
//             field: "status",
//             options: [
//               "ALL",
//               "PENDING",
//               "PROCESSING",
//               "READY_TO_SHIP",
//               "SHIPPED",
//               "DELIVERED",
//               "CANCELED",
//             ],
//             defaultValue: "PENDING",
//           },
//           {
//             label: "Time",
//             field: "time",
//             options: [
//               "ALL",
//               "last 24 hours",
//               "last 7 days",
//               "last 30 days",
//               "Custom",
//             ],
//             defaultValue: "ALL",
//           },
//         ]}
//         initialItemsPerPage={initialLimit}
//         itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
//         quickViewComponentKey={"OrderQuickView"}
//         viewPageURL={"/admin/order/view/"}
//         getDataCount={getOrderCount}
//         actions={{
//           itemAddFormKey: "",
//           itemUpdateFormKey: "",
//           quickViewComponentKey: "OrderQuickView",
//           updateAction: "",
//           deleteAction: deleteOrderById,
//           isEditabel: false,
//           viewPageURL: "/admin/product/view/",
//         }}
//       />
//     </div>
//   );
// }
// export const dynamic = "force-static";
import { hasUIPermission } from "@/lib/hasUIPermission.js";

import { auth } from "@/auth";
import AdminListPage from "../_components/AdminListPage";
import { orderConfig } from "./config";

export default async function OrderListPage() {
  const session = await auth();

  if (!hasUIPermission(session.user.permissions, "order", "view")) {
    return <div>Unauthorized</div>;
  }
  return <AdminListPage {...orderConfig} />;
}
