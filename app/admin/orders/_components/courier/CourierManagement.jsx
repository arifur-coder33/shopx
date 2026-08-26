"use client";
import {
  cancelCourierDeliveryAction,
  createCourierDeliveryAction,
} from "@/backend/serverActions/courierAction";
import { confirmFromUser } from "@/components/modal/confrim/confirm";
import { hasUIPermission } from "@/lib/hasUIPermission.js";
import { Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import CourierForm from "./CourierForm";
import CourierSelector from "./CourierSelector";
import CourierStatus from "./CourierStatus";

import { useSession } from "next-auth/react";
export default function CourierManagement({ order, status, setStatus }) {
  const [view, setView] = useState(order?.shipping ? "status" : "list"); // list, form, status
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [courierDetails, setCourierDetails] = useState(order?.shipping || null);

  const [loading, setLoading] = useState(false);
  const { data: session } = useSession();
  const permissions = session?.user?.permissions;
  const [data, setData] = useState({
    name: order?.customerName || "",
    phone: order?.phoneNumber.slice(-11) || "",
    address: `${order?.deliveryAddress}, ${order?.thana}, ${order?.city}` || "",
    price: order?.dueAmount,
    weight: order?.orderWeight,
    city: order?.city,
    storeId: "WH-01",
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = e.target;
    const formData = new FormData(form);
    const getCourierName = formData.get("courierName");
    if (!getCourierName) {
      if (selectedCourier.name)
        formData.append("courierName", selectedCourier.name);
    }

    formData.append("invoice", order?.orderNo);
    let newData = Object.fromEntries(formData.entries());

    const response = await createCourierDeliveryAction({ formData });

    if (response.success) {
      toast.success("Courier order created successfully");
      setLoading(false);
      setCourierDetails(response.data);
      setView("status");
      setError(null);
      setSuccess(true);
      setStatus("READY_TO_SHIP");
    } else {
      toast.error(response.message || "Failed to create courier order");
      setLoading(false);
      setError(response.message);
      setSuccess(null);
    }

    // Logic for API call here
    // setTimeout(() => {
    //   setCourierDetails({
    //     courierId: selectedCourier.id,
    //     courierName: selectedCourier.name,
    //     cnNumber: "PATH-992031",
    //     status: "PENDING",
    //     date: new Date().toLocaleDateString(),
    //     storeName: "Main Warehouse",
    //   });
    //   setLoading(false);
    //   setView("status");
    // }, 1000);
  };

  const handleCancle = async () => {
    const ok = await confirmFromUser({
      title: "Confirm Delete",
      message: "আপনি কি নিশ্চিত?",
    });
    if (!ok) return;

    setView("form");
    const response = await cancelCourierDeliveryAction(
      order?.shipping?.id || courierDetails?.id,
      order?.id || courierDetails?.orderId,
    );
    if (response.success) {
      toast.success("Courier delivery canceled successfully");
      // setCourierDetails(null);
      setStatus(response.data.status);
      setLoading(false);
    } else {
      toast.error("Failed to cancel courier delivery");
      return;
    }
  };

  return (
    <div
      id="courier"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6"
    >
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight">
          Delivery Integration
        </h3>
        {view === "form" && hasUIPermission(permissions, "order", "update") && (
          <button
            onClick={() => setView("list")}
            className="text-xs font-bold text-red-600 uppercase"
          >
            <Undo2 /> Back
          </button>
        )}
      </div>

      <div className="p-4 md:p-6">
        {courierDetails && view === "status" ? (
          <CourierStatus
            status={status}
            order={order}
            details={courierDetails}
            onCancel={handleCancle}
          />
        ) : (
          hasUIPermission(permissions, "order", "update") &&
          (view === "list" ? (
            <CourierSelector
              onSelect={(c) => {
                setSelectedCourier(c);
                setView("form");
              }}
              activeCourierId={courierDetails?.courierId}
            />
          ) : (
            <CourierForm
              courierName={selectedCourier?.name}
              data={data}
              onSubmit={handleCreate}
              loading={loading}
            />
          ))
        )}
      </div>
    </div>
  );
}
