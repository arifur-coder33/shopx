import { Eye, FileText, Truck } from "lucide-react";

export default function DocumentActions({
  onDownload,
  onView,
  onAWB,
  onServerDownload,
}) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4">Documents</h3>
      <div className="flex flex-col gap-3">
        <button
          onClick={onDownload}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition text-sm font-medium"
        >
          <FileText size={16} /> Download Invoice
        </button>
        <button
          onClick={onServerDownload}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition text-sm font-medium"
        >
          <FileText size={16} /> Server Download Invoice
        </button>
        <button
          onClick={onView}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
        >
          <Eye size={16} /> View Invoice
        </button>

        <button
          onClick={onAWB}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 transition text-sm font-medium"
        >
          <Truck size={16} /> Download AWB
        </button>
      </div>
    </div>
  );
}
