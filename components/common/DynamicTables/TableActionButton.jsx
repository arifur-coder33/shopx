import LazyModalButton from "@/components/modal/LazyModalButton";
import { can } from "@/lib/hasUIPermission.js";
import { Edit, Eye, Trash, View } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import DeleteItem from "../DeleteItem";
export default function TableActionButton({
  isEditabel,
  item,
  quickViewComponentKey,
  itemUpdateFormKey,
  updateAction,
  deleteAction,
}) {
  const { data: session } = useSession();
  const permissions = session?.user?.permissions;
  // console.log("Permissions in TableActionButton:", permissions);
  return (
    <td className="px-4 sticky bg-slate-200 right-0 py-2 flex items-center justify-center space-x-2 align-middle">
      {/* Adjusted padding and space-x */}
      {/* --- PARENT ROW ACTIONS --- */}
      {item?.slug && (
        <Link
          href={`/product/${encodeURIComponent(item.slug)}`}
          title="View on site"
        >
          <Eye className="w-4 h-4 text-green-500 hover:text-green-600 hover:scale-110 transition-transform" />
          {/* Reduced icon size */}
        </Link>
      )}
      <LazyModalButton
        button={
          <View className="w-4 h-4 text-blue-500 hover:text-blue-600 hover:scale-110 transition-transform" />
        }
        componentKey={quickViewComponentKey}
        itemId={item.id}
      />

      {isEditabel && (
        <LazyModalButton
          button={
            <Edit className="w-4 h-4 text-blue-500 hover:text-blue-600 hover:scale-110 transition-transform" />
          }
          data={item}
          itemId={item.id}
          updateAction={updateAction}
          actionType={"edit"}
          componentKey={itemUpdateFormKey}
        />
      )}
      {can(permissions, "order", "delete") && (
        <DeleteItem deleteItem={deleteAction} id={item.id}>
          <Trash className="w-4 h-4 text-red-500 hover:text-red-600 hover:scale-110 transition-transform" />
        </DeleteItem>
      )}
    </td>
  );
}
