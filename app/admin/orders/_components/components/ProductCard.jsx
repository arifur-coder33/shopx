export default function ProductCard({ item }) {
  return (
    <div className="p-4 flex gap-4 items-center hover:bg-slate-50 transition duration-150">
      {/* Image with subtle border */}
      <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-lg border border-slate-200 p-1 flex-shrink-0">
        <img
          src={item.image || "https://placehold.co/100"}
          alt={item.name}
          className="w-full h-full object-cover rounded-md"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 truncate">
          {item.name}
        </h4>
        <p className="text-xs text-slate-500 mt-0.5">
          Price: {item.unitPrice} ৳
        </p>
      </div>

      {/* Qty & Total */}
      <div className="text-right">
        <p className="text-xs text-slate-500 font-medium mb-1">x{item.qty}</p>
        <p className="text-sm font-bold text-slate-900">{item.total} ৳</p>
      </div>
    </div>
  );
}
