export const categoryFormFields = ({ dropdownList, loadDropDownLists }) => [
  { type: "file", label: "Thumbnail", name: "thumbnail", colSpan: "4" },
  { type: "text", label: "Category Name", name: "name", colSpan: "2" },
  {
    type: "text",
    label: "Category Slug in english",
    name: "slug",
    colSpan: "2",
  },
  {
    type: "select",
    label: "Parent Category",
    name: "parentCategory",
    colSpan: "3",
    loadLists: loadDropDownLists,
    dropDownLists: dropdownList,
    addForm: "",
  },
  { type: "file", label: "Category Banner", name: "banner", colSpan: "full" },
  { type: "categorySpecifications", label: "Specifications", name: "specifications", colSpan: "full" },
  // {
  //   type: "checkbox",
  //   label: "Has Vairant",
  //   name: "isVariation",
  //   colSpan: "1",
  // },
  {
    type: "variation",
    label: "Assaign Variation (if any).",
    name: "variations",
    colSpan: "full",
    labelNote:
      "You can add multiple variations. For example, if you have a product with size and color variations, you can add both size and color variations here.",
  },
];
