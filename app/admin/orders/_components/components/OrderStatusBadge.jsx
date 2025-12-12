export default function OrderStatusBadge({ status }) {
  const styles = {
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
    PACKED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    SHIPPED: "bg-purple-100 text-purple-700 border-purple-200",
    DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-bold border uppercase tracking-wide ${
        styles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}
