export const dynamic = "force-static";
import AddCatagoryForm from "@/components/catagory/AddCategoryForm";
import CategoryListTable from "@/components/catagory/CategoryListTable";
import ModalButton from "@/components/modal/ModalBUtton";

export default function CategoryListPage() {
  return (
    <div>
      <ModalButton>
        <AddCatagoryForm />
      </ModalButton>
      <CategoryListTable />
    </div>
  );
}
