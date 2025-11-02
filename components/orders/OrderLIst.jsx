import { dateConvertToLocalString } from "@/utils/dateConvert";
import { Edit, Eye, Trash } from "lucide-react";
import Link from "next/link";

import { deleteOrderById } from "@/backend/serverActions/orderActions";
import DeleteItem from "../common/DeleteItem";
import OrderStatusUpdate from "./OrderStatusUpdate";

export default function OrderListTable({ data }) {
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
                        orderData={order}
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

const Item = ({ data, orderData }) => {
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <td className="px-6 py-4 max-w-16 break-words whitespace-normal">
          {dateConvertToLocalString(data?.createdAt)}
        </td>
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900  dark:text-white"
        >
          {data.orderNo}
        </th>
        {/* <td className="px-6 py-4">
          <Imagecustom src={data?.images[0]} w={50} h={50} alt={data?.title} />
        </td> */}
        <td
          scope="row"
          className="px-6 py-4 max-w-28 font-medium text-gray-900 break-words whitespace-normal dark:text-white"
        >
          {data.productName}
        </td>
        <td className="px-6 py-4">{data?.price}</td>

        <td className="px-6 py-4">{data?.quantity}</td>
        <td className="px-6 py-4 max-w-24">
          <OrderStatusUpdate
            status={orderData?.status}
            orderId={orderData?.id}
          />
        </td>

        <td className="px-6 py-4 grid grid-cols-3">
          <Link
            href={`/admin/order/view/${data?.orderNo}?p=${encodeURIComponent(
              orderData?.phoneNumber
            )}`}
          >
            <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <Link href={`/admin/order/edit/${data?.orderNo}`}>
            <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <DeleteItem deleteItem={deleteOrderById} id={orderData?.id}>
            <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
          </DeleteItem>
        </td>
      </tr>
    </>
  );
};
