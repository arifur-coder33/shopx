export const dynamic = "force-static";
import { getCategory } from "@/backend/serverActions/catagoryActions";
import ModalButton from "@/components/modal/ModalBUtton";
import ProductForm from "@/components/products/ProductForm";
import ProductListTable from "@/components/products/ProductListTable";

export default async function ProductListPage() {
  const data = await getCategory();
  return (
    <div>
      <ModalButton>
        <ProductForm category={data?.data} actionType={"add"} />
      </ModalButton>
      <ProductListTable />
    </div>
  );
}
