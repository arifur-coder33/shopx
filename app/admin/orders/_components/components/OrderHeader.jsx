import { dateConvertToLocalString } from "@/utils/dateConvert";
import { Package } from "lucide-react";

export default function OrderHeader({ orderId, status, date }) {
  const getStatusColor = (s) => {
    switch (s) {
      case "DELIVERED":
        return "bg-green-100 text-green-700 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-700 border-red-200";
      case "SHIPPED":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center card ">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
          <Package size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold ">Order #{orderId}</h1>
          <p className="text-sm text-gray-500">
            Placed on {dateConvertToLocalString(date)}
          </p>
        </div>
      </div>
      <div
        className={`mt-4 md:mt-0 px-4 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(
          status,
        )}`}
      >
        {status}
      </div>
    </div>
  );
}
