// export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import ModalButton from "@/components/modal/ModalButton";

import ProductForm from "@/components/products/ProductForm";
import ProductListTable from "@/components/products/ProductListTable";

export default async function ProductListPage() {
  const data = await getCategory();

  const tableProperty = {
    Image: "image",
    ProductName: "title",
    Category: "category",
    price: "discountPrice",
  };

  const formProperty = [
    {
      labelName: "isActive",
      inputName: "isActive",
      inputType: "checkbox",
      colSpan: { mobile: "2", desktop: "2" },
      required: false,
    },
    {
      labelName: "isActive",
      inputName: "isActive",
      inputType: "checkbox",
      colSpan: { mobile: "2", desktop: "2" },
      required: false,
    },
    {
      labelName: "Location",
      inputName: "located",
      inputType: "text",
      colSpan: { mobile: "12", desktop: "4" },
      required: true,
    },
    {
      labelName: "Subject",
      inputName: "majorSubject",
      inputType: "text",
      colSpan: { mobile: "12", desktop: "4" },
      required: true,
    },
    {
      labelName: "Duration",
      inputName: "duration",
      inputType: "number",
      colSpan: { mobile: "6", desktop: "4" },
    },
    {
      labelName: "Duration Type",
      inputName: "durationType",
      inputType: "select",
      colSpan: { mobile: "6", desktop: "4" },
      required: true,
      options: [
        { name: "Year", value: "Year" },
        { name: "Month", value: "Month" },
      ],
    },
    {
      labelName: "CGPA",
      inputName: "CGPA",
      inputType: "number",
      colSpan: { mobile: "6", desktop: "4" },
    },
    {
      labelName: "OutOf",
      inputName: "outOf",
      inputType: "number",
      colSpan: { mobile: "6", desktop: "4" },
    },
    {
      labelName: "Passing year",
      inputName: "passingYear",
      inputType: "number",
      colSpan: { mobile: "6", desktop: "4" },
      required: true,
    },
    {
      labelName: "Description",
      inputName: "description",
      inputType: "textArea",
      editor: true,
      colSpan: { mobile: "12", desktop: "12" },
      required: false,
    },
  ];

  return (
    <>
      <div className=""></div>
      <ModalButton buttonName={"Add Product"}>
        <ProductForm category={data?.data} actionType={"add"} />
      </ModalButton>
      <ProductListTable />
    </>
  );
}
