import Imagecustom from "@/components/images/ImageCustom";

export default function OrderItemsTable({
  items,
  style,
  status,
  orderNo,
  date,
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold">
          {style !== "user" ? (
            `Order Items (${items?.length})`
          ) : (
            <div className="flex flex-row justify-between">
              <div className="">
                <p>Order No# {orderNo}</p>
                <p className="text-sm text-gray-500">
                  Order Date:{" "}
                  {new Date(date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className=" text-gray-500">
                  Status:{" "}
                  <span className="font-lg rounded-md px-2 py-1 bg-gray-100 text-gray-700">
                    {status}
                  </span>
                </p>
              </div>
            </div>
          )}
        </h3>
      </div>

      {/* Desktop Header */}
      {style !== "user" && (
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
          <div className="col-span-6">Product</div>
          <div className="col-span-2 text-center">Price</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Total</div>
        </div>
      )}
      <div className="divide-y divide-gray-100">
        {items?.map((item) => (
          <div
            key={item.id}
            className="p-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center"
          >
            {/* Product Info */}
            <div className="col-span-6 flex items-center gap-4 w-full">
              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {item.thumbnail ? (
                  <Imagecustom
                    w={70}
                    h={70}
                    src={item.thumbnail}
                    alt={item.productName || "Product Image"}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    IMG
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{item.productName}</p>

                {item.combinations && (
                  <div className="flex">
                    {JSON.parse(item.combinations).map((variation, index) => (
                      <span key={index} className="text-sm text-gray-500 mr-2">
                        {variation.name}:{variation?.value}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-xs text-gray-500 mr-2">
                  {item?.sku && `SKU: ${item.sku}`}
                </span>
              </div>
            </div>

            {/* Mobile Labels included for responsiveness */}
            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden text-gray-500 text-sm">
                Unit Price:
              </span>
              <span className="text-gray-700">{item.price} ৳</span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden text-gray-500 text-sm">Quantity:</span>
              <span className="text-gray-700 font-medium">
                x {item.quantity}
              </span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-right">
              <span className="md:hidden text-gray-500 text-sm">Subtotal:</span>
              <span className="text-gray-900 font-bold">
                {item.quantity * item?.price} ৳
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
