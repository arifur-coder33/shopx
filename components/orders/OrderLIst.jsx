import { dateConvertToLocalString } from "@/utils/dateConvert";
import { Delete, Edit, Edit2, Eye, Trash, View } from "lucide-react";

export default async function OrderListTable({ data }) {
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
              data?.map((item) => <Item key={item?.id} data={item} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

const Item = ({ data }) => {
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
      <td className="px-6 py-4">{dateConvertToLocalString( data?.createdAt)}</td>
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
        <td className="px-6 py-4">{data?.orderPrice}</td>

        <td className="px-6 py-4">{data?.quantity}</td>
        <td className="px-6 py-4">{data?.status}</td>
   
        <td className="px-6 py-4 grid grid-cols-3">
      
             <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer"/>
          
          
     
            <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer"/>
            <Trash className="text-red-500 hover:scale-105 transition cursor-pointer"/>
          
        </td>
      </tr>
    </>
  );
};
