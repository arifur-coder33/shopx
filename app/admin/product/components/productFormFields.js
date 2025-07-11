// import { getCategory } from "@/backend/serverActions/categoryActions";

export const productFormFields = ({
  categoryDropdownList,
  onSelectCategoryHandler,
  loadCategoryDropDownLists,
  productVariationList,
}) => [
  {
    type: "checkbox",
    label: "Is Active",
    name: "isActive",
    colSpan: "1",
    defaultChecked: true,
  },
  {
    type: "checkbox",
    label: "Is Featured Product",
    name: "isFeatured",
    colSpan: "1",
  },
  { type: "file", label: "Main Image", name: "thumbnail", colSpan: "full" },
  { type: "text", label: "Product Name", name: "title", colSpan: "full" },
  { type: "text", label: "Product Slug", name: "slug", colSpan: "full" },
  {
    type: "select",
    label: "Category",
    name: "category",
    loadLists: loadCategoryDropDownLists,
    dropDownLists: categoryDropdownList,
    colSpan: "2",
    addForm: "CategoryForm",
    onSelect: onSelectCategoryHandler,
  },
  {
    type: "number",
    label: "Regular Price",
    name: "regularPrice",
    colSpan: "2",
  },
  {
    type: "number",
    label: "Discount Price",
    name: "discountPrice",
    colSpan: "2",
  },
  {
    type: "text",
    label: "Inside Dhaka Delivery Charge",
    name: "insideDhaka",
    colSpan: "2",
  },
  {
    type: "text",
    label: "Outside Dhaka Delivery Charge",
    name: "outSideDhaka",
    colSpan: "2",
  },
  {
    type: "text",
    label: "Product Weigh",
    name: "weight",
    colSpan: "2",
  },

  {
    type: "file",
    label: "Product Gallery",
    multiple: true,
    name: "gallery",
    colSpan: "full",
  },
  {
    type: "text",
    label: "Video URL",
    name: "videoUrl",
    colSpan: "2",
  },
  {
    type: "tag",
    label: "Product Tag",
    name: "seoKeyWord",
    colSpan: "full",
  },
  {
    type: "text",
    label: "Seo Description",
    name: "seoDescription",
    colSpan: "full",
  },
  { type: "editor", label: "Description", name: "description" },
  {
    type: "productVariation",
    label: "Add Product variation",
    name: "variations",
    variationList: productVariationList,
    colSpan: "full",
  },
];
