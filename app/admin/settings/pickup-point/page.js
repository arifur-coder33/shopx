// // app/admin/order/page.js
// export const revalidate = 60;
// export const dynamic = "force-static";
// import {
//   deleteCategoryAction,
//   getAllCategoriesList,
//   getcategoryCount,
//   updateCategoryAction,
// } from "@/backend/serverActions/catagoryActions";
// import DynamicTable from "@/components/common/DynamicTables/Index";

// export default async function PickupPointPage() {
//   const tableProperties = [
//     {
//       label: "Courier Name",
//       field: "courierName",
//       type: "text",
//       required: true,
//       sort: true,
//     },
//     {
//       label: "Store ID",
//       field: "storeId",
//       type: "text",
//       required: true,
//       sort: true,
//     },

//     {
//       label: "Name",
//       field: "name",
//       type: "text",
//       required: true,
//       sort: true,
//     },
//     {
//       label: "Address",
//       field: "address",
//       type: "text",
//       required: true,
//     },

//     {
//       label: "Phone",
//       field: "phone",
//       type: "text",
//       sort: true,
//     },
//     {
//       label: "Email",
//       field: "email",
//       type: "text",
//       sort: true,
//       required: false,
//     },
//   ];

//   const initialLimit = 10;

//   const { success, data, nextCursor, error } = await getAllCategoriesList({
//     limit: initialLimit,
//     tableProperties,
//   });

//   if (!success) return `Something went wrong: ${error}`;

//   return (
//     <div className="p-4">
//       <DynamicTable
//         // Data and Actions
//         tableName={"Pickup Point List"}
//         initialData={data}
//         initialNextCursor={nextCursor}
//         fetchAction={getAllCategoriesList}
//         tableProperties={tableProperties}
//         // Filtering Properties
//         filterSearchProperties={[
//           { label: " Courier Name", field: "courierName" },
//           { label: " Store Name", field: "storeName" },
//         ]}
//         filterTagProperties={[]}
//         initialItemsPerPage={initialLimit}
//         itemsPerPageOptions={[2, 5, 10, 25, 50, 100]} // Dropdown options
//         getDataCount={getcategoryCount}
//         actions={{
//           getItemDataAction: "",
//           itemAddFormKey: "PickupStoreForm",
//           itemUpdateFormKey: "PickupStoreForm",
//           quickViewComponentKey: "",
//           updateAction: updateCategoryAction,
//           deleteAction: deleteCategoryAction,
//           actionType: "edit",
//           viewPageURL: "",
//         }}
//       />
//     </div>
//   );
// }
