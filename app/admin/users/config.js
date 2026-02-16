import {
  deleteUserById,
  getUserCount,
  GetUserList,
} from "@/backend/serverActions/authActions";
import {
  getAllRoleList,
  updateUserRole,
} from "@/backend/serverActions/roleAction";

export const UserConfig = {
  title: "User List",

  tableProperties: [
    // {
    //   label: "",
    //   field: "expand",
    //   type: "expand",
    //   expandSource: "orderItems",
    //   expandProperties: [
    //     {
    //       label: "Thumbnail",
    //       field: "thumbnail",
    //       type: "image",
    //       alt: "productName",
    //     },
    //     { label: "Product Name", field: "productName", type: "text" },
    //     { label: "SKU", field: "sku", type: "text" },
    //     { label: "Price", field: "price", type: "currency" },
    //     { label: "Qty", field: "quantity", type: "text" },
    //   ],
    // },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Name", field: "name", type: "text", sort: true },
    { label: "Email", field: "email", type: "text" },
    { label: "Phone", field: "phone", type: "text" },
    {
      label: "Role",
      field: "role",
      type: "dropdown",
      loadLists: getAllRoleList,
      onSelect: updateUserRole,
      searchOff: true,
      isConfrim: true,
    },
    // { label: "Status", field: "status", type: "badge" },
  ],

  fetchAction: GetUserList,
  getCountAction: getUserCount,
  deleteAction: deleteUserById,

  fetchParams: {
    role: "ALL",
  },

  filterSearchProperties: [
    { label: "Name", field: "name" },
    { label: "Email", field: "email" },
    { label: "Phone Number", field: "phoneNumber" },
  ],

  filterTagProperties: [
    {
      label: "Role",
      field: "role",
      options: ["ALL", "SUPER_ADMIN", "ADMIN", "MANAGER", "USER"],
      defaultValue: "ALL",
    },
  ],

  initialLimit: 10,
  quickViewComponentKey: "OrderQuickView",
  itemAddFormKey: "",
  itemUpdateFormKey: "",
  viewPageURL: "",
  editable: false,
};
