export default function OrderItemsTable({ items }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold">Order Items ({items?.length})</h3>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
        <div className="col-span-6">Product</div>
        <div className="col-span-2 text-center">Price</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      <div className="divide-y divide-gray-100">
        {items?.map((item) => (
          <div
            key={item.id}
            className="p-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
          >
            {/* Product Info */}
            <div className="col-span-6 flex items-center gap-4 w-full">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    IMG
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.variant && (
                  <p className="text-sm text-gray-500">{item.variant}</p>
                )}
              </div>
            </div>

            {/* Mobile Labels included for responsiveness */}
            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden text-gray-500 text-sm">
                Unit Price:
              </span>
              <span className="text-gray-700">{item.unitPrice} ৳</span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden text-gray-500 text-sm">Quantity:</span>
              <span className="text-gray-700 font-medium">x {item.qty}</span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-right">
              <span className="md:hidden text-gray-500 text-sm">Subtotal:</span>
              <span className="text-gray-900 font-bold">{item.total} ৳</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
