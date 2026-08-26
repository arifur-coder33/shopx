import { deleteOrderById } from "@/backend/serverActions/orderActions";

import {
  getAllSuppliers,
  getSupplierCount,
} from "@/backend/serverActions/supplierAction";
export const supplierConfig = {
  title: "Supplier List",

  resource: "supplier",

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
    { label: "Supplier No", field: "supplierCode", type: "text", sort: true },
    { label: "Supplier Name", field: "companyName", type: "text", sort: true },

    { label: "Status", field: "isActive", type: "badge" },
  ],

  fetchAction: getAllSuppliers,
  getCountAction: getSupplierCount,
  deleteAction: deleteOrderById,

  fetchParams: {
    // time: "ALL",
    isActive: "true",
  },

  filterSearchProperties: [
    { label: "Supplier No", field: "supplierCode" },
    { label: "Supplier Name", field: "companyName" },
    { label: "Phone Number", field: "phoneNumber" },
  ],

  filterTagProperties: [
    {
      label: "Status",
      field: "status",
      options: ["ALL", "ACTIVE", "INACTIVE"],
      defaultValue: "ALL",
    },
    // {
    //   label: "Time",
    //   field: "time",
    //   options: [
    //     "ALL",
    //     "last 24 hours",
    //     "last 7 days",
    //     "last 30 days",
    //     "Custom",
    //   ],
    //   defaultValue: "ALL",
    // },
  ],

  initialLimit: 5,
  quickViewComponentKey: "SupplierQuickView",
  itemAddFormKey: "SupplierForm",
  itemUpdateFormKey: "SupplierForm",
  viewPageURL: "",
  editable: true,
};
