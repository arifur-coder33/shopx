"use client";
import { useState } from "react";
import CourierForm from "./CourierForm";
import CourierSelector from "./CourierSelector";
import CourierStatus from "./CourierStatus";

export default function CourierManagement({ order }) {
  const [view, setView] = useState("list"); // list, form, status
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [courierDetails, setCourierDetails] = useState(
    order?.courierDetails || null
  );
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: order?.customerName || "",
    phone: order?.phoneNumber || "",
    address: order?.deliveryAddress || "",
    price: order?.orderPrice + order?.deliveryCharge - (order?.discount || 0),
    weight: 0.5,
    city: "",
    storeId: "WH-01",
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Logic for API call here
    setTimeout(() => {
      setCourierDetails({
        courierId: selectedCourier.id,
        courierName: selectedCourier.name,
        cnNumber: "PATH-992031",
        status: "PENDING",
        date: new Date().toLocaleDateString(),
        storeName: "Main Warehouse",
      });
      setLoading(false);
      setView("status");
    }, 1000);
  };

  const handleCancle = () => {
    setCourierDetails(null);
    setView("form");
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-slate-800 text-sm tracking-tight">
          Delivery Integration
        </h3>
        {view === "form" && (
          <button
            onClick={() => setView("list")}
            className="text-xs font-bold text-indigo-600 uppercase"
          >
            Back
          </button>
        )}
      </div>

      <div className="p-4 md:p-6">
        {courierDetails && view === "status" ? (
          <CourierStatus details={courierDetails} onCancel={handleCancle} />
        ) : view === "list" ? (
          <CourierSelector
            onSelect={(c) => {
              setSelectedCourier(c);
              setView("form");
            }}
            activeCourierId={courierDetails?.courierId}
          />
        ) : (
          <CourierForm
            courierName={selectedCourier.name}
            formData={formData}
            onChange={(e) =>
              setFormData({ ...formData, [e.target.name]: e.target.value })
            }
            onSubmit={handleCreate}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
