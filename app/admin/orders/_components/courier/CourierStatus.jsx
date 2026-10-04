import { Calendar, Truck, XCircle } from "lucide-react";
import { downloadAWBPDF } from "../components/GenerateAWB";
import GetCourierStatus from "./GetCourierStatus";

export default function CourierStatus({ details, onCancel, order, status, shopName }) {
  const steadfastBooking = order?.fraudRiskFactors?.find((factor) => factor?.code === "STEADFAST_TRACKING");
  const savedTrackingCode = steadfastBooking?.trackingCode;
  const trackingCode = details.trackingCode || savedTrackingCode;
  const trackingLink = details.trackingLink || steadfastBooking?.trackingLink;
  const parcelStatus = details.status || steadfastBooking?.status;
  const invoiceData = {
    shopName,
    shopId: "1181689",
    invoice: order.orderNo,
    sfId: details.cn,
    deliveryType: "Home",
    weight: order.weight || 0.5,
    name: order.customerName || "",
    phone: order.phoneNumber || "",
    address: order.deliveryAddress || "",
    cod: details.cod || order.amount || 0,
    courierName: details.courierName,
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
            {parcelStatus || "Booked"}
          </span>
          <h4 className="mt-2 font-bold text-slate-800 text-lg uppercase">
            {details.courierName}
          </h4>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div className="flex items-center gap-1 justify-end">
            <Calendar size={12} />{" "}
            {new Date(details.createdAt).toLocaleDateString("en-BD")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-slate-50 py-4">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Consignment ID
          </p>
          <p className="text-sm font-mono font-bold text-indigo-600">
            #{details.cn}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Pickup From
          </p>
          <p className="text-sm font-semibold">{details.storeName}</p>
        </div>
      </div>
      {trackingCode && <div className="rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">Tracking code</p>
        <p className="mt-0.5 font-mono text-sm font-bold text-slate-800">{trackingCode}</p>
        {trackingLink && <a href={trackingLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-indigo-600 underline">Track parcel</a>}
      </div>}
      <div>
        <div className="text-base font-bold  tracking-tighter mb-2">
          Current Courier Status :{" "}
          {details.courierName !== "Manual Delivery" ? (
            <GetCourierStatus
              courierId={details.cn}
              courierProviderId={details.courierProviderId}
            />
          ) : (
            <span className="rounded-3xl bg-slate-200 px-2">Manual</span>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => downloadAWBPDF(invoiceData)}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition text-sm font-medium"
        >
          <Truck size={16} /> Download AWB
        </button>
        {status !== "SHIPPED" && status !== "DELIVERED" && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-2 px-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
          >
            <XCircle size={16} /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
