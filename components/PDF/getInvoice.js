import { Eye, FileText, PackageCheck, Printer } from "lucide-react";

const baseStyle = "flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition";
const primaryStyle = "bg-gray-900 text-white hover:bg-gray-800";
const secondaryStyle = "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50";

const documentLabels = {
  "packing-list": { label: "Download Packing List", Icon: PackageCheck },
  awb: { label: "Download AWB", Icon: Printer },
};

export default function InvoiceButton({
  orderData,
  actionType = "view",
  admin = false,
  documentType = "invoice",
  disabled = false,
}) {
  const download = actionType === "download";
  const params = new URLSearchParams();
  let endpoint;
  if (admin && orderData?.id) {
    endpoint = "/api/admin/order-documents";
    params.set("id", orderData.id);
    params.set("document", documentType);
  } else if (!admin && documentType === "invoice" && orderData?.orderNo && orderData?.phoneNumber) {
    endpoint = "/api/pdf/invoice";
    params.set("o", orderData.orderNo);
    params.set("p", orderData.phoneNumber);
  }
  if (download) params.set("download", "1");

  const { label, Icon } = documentLabels[documentType] || {
    label: download ? "Download Invoice" : "View Invoice",
    Icon: download ? FileText : Eye,
  };
  const style = documentType === "awb"
    ? "border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
    : documentType === "invoice" && download ? primaryStyle : secondaryStyle;
  const content = <><Icon size={16} aria-hidden="true" />{label}</>;

  if (!endpoint || disabled) {
    return <button type="button" disabled className={`${baseStyle} ${style} cursor-not-allowed opacity-40`}>{content}</button>;
  }

  return <a href={`${endpoint}?${params}`} target="_blank" rel="noopener noreferrer" className={`${baseStyle} ${style}`}>{content}</a>;
}
