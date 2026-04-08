import Imagecustom from "@/components/images/ImageCustom";
const styles = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
  READY_TO_SHIP: "bg-indigo-100 text-indigo-700 border-indigo-200",
  SHIPPED: "bg-purple-100 text-purple-700 border-purple-200",
  DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function OrderItemsTable({
  items,
  style,
  status,
  orderNo,
  date,
}) {
  return (
    <div className=" card">
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold">
          {style !== "user" ? (
            `Order Items (${items?.length})`
          ) : (
            <div className="flex flex-row justify-between">
              <div className="">
                <p>Order No# {orderNo}</p>
                <p className="text-sm ">
                  Order Date:{" "}
                  {new Date(date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className=" ">
                  <span
                    className={`font-lg rounded-2xl px-2 py-1 border-2  border-gray-300 ${styles[status] || ""}`}
                  >
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
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b text-sm font-medium ">
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
                  <div className="w-full h-full flex items-center justify-center ">
                    IMG
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium ">{item.productName}</p>

                {item.combinations && (
                  <div className="flex">
                    {JSON.parse(item.combinations).map((variation, index) => (
                      <span
                        key={index}
                        className="text-sm  mr-2 border-2  rounded-full px-2 py-1 text-[9px]"
                      >
                        {variation.name}:{variation?.value}
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-xs  mr-2">
                  {item?.sku && `SKU: ${item.sku}`}
                </span>
              </div>
            </div>

            {/* Mobile Labels included for responsiveness */}
            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden text-sm">Unit Price:</span>
              <span className="">{item.price} ৳</span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-center">
              <span className="md:hidden  text-sm">Quantity:</span>
              <span className=" font-medium">x {item.quantity}</span>
            </div>

            <div className="col-span-2 flex justify-between w-full md:block md:text-right">
              <span className="md:hidden  text-sm">Subtotal:</span>
              <span className="font-bold">{item.quantity * item?.price} ৳</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
