export const supplierFormFields = () => [
  {
    type: "checkbox",
    label: "Is Active",
    name: "isActive",
    colSpan: "1",
    defaultChecked: true,
  },
  { type: "text", label: "Supplier Name", name: "companyName", colSpan: "2" },
  {
    type: "contactName",
    label: "Contact Name",
    name: "contactName",
    colSpan: "2",
  },
  { type: "text", label: "Phone Number", name: "phone", colSpan: "2" },
  { type: "text", label: "Email", name: "email", colSpan: "2" },
  { type: "text", label: "Address", name: "address", colSpan: "2" },
  { type: "text", label: "City", name: "city", colSpan: "2" },
  { type: "text", label: "Country", name: "country", colSpan: "2" },
  { type: "text", label: "Trade License", name: "tradeLicense", colSpan: "2" },
  { type: "text", label: "Tin", name: "tin", colSpan: "2" },
  { type: "text", label: "Bin", name: "bin", colSpan: "2" },
  {
    type: "number",
    label: "Opening Balance",
    name: "openingBalance",
    colSpan: "2",
  },

  {
    type: "file",
    label: "Documnent Upload",
    multiple: true,
    name: "documents",
    colSpan: "full",
  },
  { type: "editor", label: "Notes", name: "notes", colSpan: "full" },
];
