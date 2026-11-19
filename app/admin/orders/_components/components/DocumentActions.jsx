import InvoiceButton from "@/components/PDF/getInvoice";

export default function DocumentActions({ order, hasConsignment }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">Documents</h3>
      <div className="flex flex-col gap-3">
        <InvoiceButton orderData={order} actionType="download" admin />
        <InvoiceButton orderData={order} actionType="view" admin />
        <InvoiceButton orderData={order} actionType="download" documentType="packing-list" admin />
        <InvoiceButton orderData={order} actionType="download" documentType="awb" admin disabled={!hasConsignment} />
      </div>
    </div>
  );
}
