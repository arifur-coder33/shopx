import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "react-toastify";
export default function AdminActions({
  status,
  setStatus,
  courier,
  setCourier,
  adminDiscount,
  setAdminDiscount,
  adminNote,
  setAdminNote,
  onUpdateStatus,
  onCreateCourier,
  onSaveNote,
  orderId,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const permissions = session?.user?.permissions;
  const steps = ["PENDING", "PACKED", "SHIPPED", "DELIVERED", "CANCELLED"];
  const handleSaveNote = async () => {
    if (orderId && (adminDiscount || adminNote)) {
      setIsLoading(true);
      const { updateOrderExtraDiscountAction } =
        await import("../../../../../backend/serverActions/orderActions");
      const response = await updateOrderExtraDiscountAction({
        orderId: orderId,
        adminNote: adminNote,
        adminDiscount: adminDiscount,
      });
      if (response.success) {
        setIsLoading(false);
        toast.success("Order note and discount saved successfully!");
      } else {
        setIsLoading(false);
        toast.error("Failed to save order note and discount.");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <h3 className="text-lg font-semibold">Admin Actions</h3>

      {/* Note & Discount */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Discount Adjustment
          </label>
          <input
            disabled={isLoading || status !== "PENDING"}
            type="number"
            defaultValue={adminDiscount}
            onChange={(e) => setAdminDiscount(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase">
            Admin Note
          </label>
          <textarea
            disabled={
              isLoading || !hasUIPermission(permissions, "order", "update")
            }
            defaultValue={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
            placeholder="Internal notes..."
          ></textarea>
        </div>
        {hasUIPermission(permissions, "order", "update") && (
          <button
            disabled={isLoading}
            onClick={handleSaveNote}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
          >
            {isLoading ? "Saving..." : "Save Note & Discount"}
          </button>
        )}
      </div>
    </div>
  );
}
