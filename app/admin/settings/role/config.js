import {
  deleteRoleById,
  getRoleCount,
  getRoleList,
} from "@/backend/serverActions/roleAction";

export const roleConfig = {
  title: "Role List",

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

    { label: "Name", field: "name", type: "text", sort: true },
  ],

  fetchAction: getRoleList,
  getCountAction: getRoleCount,
  deleteAction: deleteRoleById,

  fetchParams: {
    role: "ALL",
  },

  filterSearchProperties: [{ label: "Name", field: "name" }],

  // filterTagProperties: [
  //   {
  //     label: "Role",
  //     field: "role",
  //     options: ["ALL", "SUPER_ADMIN", "ADMIN", "MANAGER", "USER"],
  //     defaultValue: "ALL",
  //   },
  // ],

  initialLimit: 10,
  quickViewComponentKey: "ResourseRoleView",
  itemAddFormKey: "",
  itemUpdateFormKey: "",
  viewPageURL: "",
  editable: false,
};
