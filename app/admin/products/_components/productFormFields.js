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
  {
    type: "file",
    label: "Main Image",
    name: "thumbnail",
    colSpan: "full",
    required: true,
  },
  {
    type: "text",
    label: "Product Name",
    name: "title",
    colSpan: "full",
    required: true,
  },
  { type: "text", label: "Product Slug", name: "slug", colSpan: "full" },
  {
    type: "text",
    label: "Canonical URL",
    name: "canonicalUrl",
    colSpan: "full",
  },
  {
    type: "select",
    label: "Category",
    name: "category",
    loadLists: loadCategoryDropDownLists,
    dropDownLists: categoryDropdownList,
    colSpan: "2",
    addForm: "CategoryForm",
    onSelect: onSelectCategoryHandler,
    required: true,
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
    colSpan: "full",
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
