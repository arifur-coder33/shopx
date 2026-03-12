import {
  deleteOrderById,
  getAllOrder,
  getOrderCount,
} from "@/backend/serverActions/orderActions";

export const orderConfig = {
  title: "Order List",

  resource: "order",

  tableProperties: [
    {
      label: "",
      field: "expand",
      type: "expand",
      expandSource: "orderItems",
      expandProperties: [
        {
          label: "Thumbnail",
          field: "thumbnail",
          type: "image",
          alt: "productName",
        },
        { label: "Product Name", field: "productName", type: "text" },
        { label: "SKU", field: "sku", type: "text" },
        { label: "Price", field: "price", type: "currency" },
        { label: "Qty", field: "quantity", type: "text" },
      ],
    },
    { label: "Created At", field: "createdAt", type: "date", sort: true },
    { label: "Order No", field: "orderNo", type: "text", sort: true },
    { label: "Customer", field: "customerName", type: "text", sort: true },
    { label: "Total Price", field: "orderPrice", type: "currency", sort: true },
    { label: "Status", field: "status", type: "badge" },
  ],

  fetchAction: getAllOrder,
  getCountAction: getOrderCount,
  deleteAction: deleteOrderById,

  fetchParams: {
    time: "ALL",
    status: "PENDING",
  },

  filterSearchProperties: [
    { label: "Order No", field: "orderNo" },
    { label: "SKU", field: "sku" },
    { label: "Phone Number", field: "phoneNumber" },
  ],

  filterTagProperties: [
    {
      label: "Status",
      field: "status",
      options: [
        "ALL",
        "PENDING",
        "PROCESSING",
        "READY_TO_SHIP",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      defaultValue: "PENDING",
    },
    {
      label: "Time",
      field: "time",
      options: [
        "ALL",
        "last 24 hours",
        "last 7 days",
        "last 30 days",
        "Custom",
      ],
      defaultValue: "ALL",
    },
  ],

  initialLimit: 2,
  quickViewComponentKey: "OrderQuickView",
  itemAddFormKey: "",
  itemUpdateFormKey: "",
  viewPageURL: "/admin/order/view/",
  editable: false,
};
