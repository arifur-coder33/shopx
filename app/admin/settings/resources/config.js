import {
  deleteResourceById,
  getResourceCount,
  getResourceList,
} from "@/backend/serverActions/resourceAction";

export const resourceConfig = {
  title: "Resource List",

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

    { label: "Name", field: "key", type: "text", sort: true },
  ],

  fetchAction: getResourceList,
  getCountAction: getResourceCount,
  deleteAction: deleteResourceById,

  fetchParams: {
    role: "ALL",
  },

  filterSearchProperties: [{ label: "Name", field: "key" }],

  // filterTagProperties: [
  //   {
  //     label: "Role",
  //     field: "role",
  //     options: ["ALL", "SUPER_ADMIN", "ADMIN", "MANAGER", "USER"],
  //     defaultValue: "ALL",
  //   },
  // ],

  initialLimit: 10,
  quickViewComponentKey: "",
  itemAddFormKey: "ResourseForm",
  itemUpdateFormKey: "ResourseForm",
  viewPageURL: "",
  editable: true,
};
