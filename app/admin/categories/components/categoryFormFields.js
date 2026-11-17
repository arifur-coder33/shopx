import { defaultCategoryDeliveryBenefits } from "@/lib/categoryDeliveryBenefits";

export const categoryFormFields = ({ dropdownList, loadDropDownLists, parentId, onParentSelect }) => [
  { type: "file", label: "Thumbnail", recommendedSize: "600 × 600 px recommended", name: "thumbnail", colSpan: "4" },
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
    onSelect: onParentSelect,
    onClear: onParentSelect,
    addForm: "",
  },
  { type: "categoryUnit", name: "unitName", parentId },
  ...Object.keys(defaultCategoryDeliveryBenefits).flatMap((name) => {
    const label = name === "exchangeText" ? "Exchange" : "Return";
    return [
      {
        type: "nativeSelect", name: `${name}Mode`, label: label + " সুবিধা",
        defaultValue: "inherit",
        options: [
          { value: "inherit", label: parentId ? "প্যারেন্টের সেটিং" : "ডিফল্ট (৩ দিন)" },
          { value: "on", label: "চালু · নিজের লেখা" },
          { value: "off", label: "বন্ধ" },
        ],
      },
      { type: "text", label: label + " Text (নিজের লেখা বাছলে)", name, colSpan: "4" },
    ];
  }),
  { type: "file", label: "Category Banner", recommendedSize: "1600 × 600 px recommended", name: "banner", colSpan: "full" },
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
    sizeChart: true,
    parentId,
    colSpan: "full",
    labelNote:
      "You can add multiple variations. For example, if you have a product with size and color variations, you can add both size and color variations here.",
  },
];
