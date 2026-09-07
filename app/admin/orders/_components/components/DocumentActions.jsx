import { Eye, FileText, PackageCheck, Printer } from "lucide-react";

export default function DocumentActions({
  onDownload,
  onView,
  onAWB,
  onPacking,
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
          onClick={onView}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
        >
          <Eye size={16} /> View Invoice
        </button>
        <button
          onClick={onPacking}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition text-sm font-medium"
        >
          <PackageCheck size={16} /> Download Packing List
        </button>
        <button
          disabled={!onAWB}
          onClick={onAWB}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Printer size={16} /> Download AWB
        </button>
      </div>
    </div>
  );
}
