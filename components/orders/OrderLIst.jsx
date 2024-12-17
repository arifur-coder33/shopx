
import { dateConvertToLocalString } from "@/utils/dateConvert";
import { Edit, Eye, Trash } from "lucide-react";
import Link from "next/link";

import OrderStatusUpdate from "./OrderStatusUpdate";

export default  function OrderListTable({ data }) {
  return (
    <>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                date
              </th>
              <th scope="col" className="px-6 py-3">
                order No
              </th>
              {/* <th scope="col" className="px-6 py-3">
                Image
              </th> */}
              <th scope="col" className="px-6 py-3">
                Product name
              </th>

              <th scope="col" className="px-6 py-3">
                Price
              </th>
              <th scope="col" className="px-6 py-3">
                Qty
              </th>
              <th scope="col" className="px-6 py-3">
                Status
              </th>
              <th scope="col" className="px-6 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.length > 0 &&
              data?.map((order) => {
                return (
                  <>
                    {order?.orderItems?.map((orderItem) => (
                      <Item
                        key={orderItem?.id}
                        data={orderItem}
                        phoneNumber={order?.phoneNumber}
                      />
                    ))}
                  </>
                );
              })}
          </tbody>
        </table>
      </div>
    </>
  );
}

const Item = ({ data, phoneNumber }) => {
  console.log(phoneNumber);
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <td className="px-6 py-4">
          {dateConvertToLocalString(data?.createdAt)}
        </td>
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {data.orderNo}
        </th>
        {/* <td className="px-6 py-4">
          <Imagecustom src={data?.images[0]} w={50} h={50} alt={data?.title} />
        </td> */}
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {data.productName}
        </th>
        <td className="px-6 py-4">{data?.price}</td>

        <td className="px-6 py-4">{data?.quantity}</td>
        <td className="px-6 py-4"><OrderStatusUpdate status={data?.status}/></td>

        <td className="px-6 py-4 grid grid-cols-3">
          <Link href={`/admin/order/view/${data?.orderNo}?p=${phoneNumber}`}>
            <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>

          <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
        </td>
      </tr>
    </>
  );
};
