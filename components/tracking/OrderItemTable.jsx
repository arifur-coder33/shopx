import { replaceNumbers } from "@/utils/engToBanNumber";
import Imagecustom from "../images/ImageCustom";
export default function OrderItemTable({ data }) {
  console.log(data?.orderItems);
  return (
    <div className="relative overflow-x-scroll sm:col-span-full mt-8">
      <table className="w-full table-fixed text-sm text-left rtl:text-right dark:text-gray-400">
        <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            <th scope="col" className="px-6 py-3 w-1/12">
              নংঃ
            </th>
            <th scope="col" className="px-6 py-3 w-2/12">
              ফটোঃ
            </th>
            <th scope="col" className="px-6 py-3 w-4/12">
              পণ্য
            </th>
            <th scope="col" className="hidden sm:table-cell px-6 py-3 w-2/12">
              মুল্য
            </th>
            <th scope="col" className="hidden sm:table-cell px-6 py-3 w-2/12">
              সংখ্যা
            </th>
            <th scope="col" className="px-6 py-3 w-2/12">
              মোট মুল্য
            </th>
          </tr>
        </thead>
        <tbody>
          {data?.orderItems?.length > 0 &&
            data?.orderItems?.map((item) => (
              <Item key={item?.id} data={item} />
            ))}
          <tr className="font-bold">
            <td colSpan="3" className="p-2 text-right col-span-3 sm:hidden">
              মোট পন্যর মুল্যঃ
            </td>
            <td className="p-2 text-right hidden sm:table-cell" colSpan="5">
              মোট পন্যর মুল্যঃ
            </td>
            <td className="p-2">
              {replaceNumbers(data?.orderPrice.toString())}
            </td>
          </tr>
          <tr className="font-bold">
            <td colSpan="3" className="p-2 text-right col-span-3 sm:hidden">
              ডেলিভারি চার্জঃ {`(টাকা)`}
            </td>
            <td className="p-2 text-right hidden sm:table-cell" colSpan="5">
              ডেলিভারি মুল্যঃ {`(টাকা)`}
            </td>
            <td className="p-2">
              {replaceNumbers(data?.deliveryCharge.toString())}
            </td>
          </tr>
          <tr className="border-t-2 border-t-slate-500 font-bold text-lg">
            <td colSpan="3" className="p-2 text-right col-span-3 sm:hidden">
              মোট মুল্যঃ {`(টাকা)`}
            </td>
            <td className="p-2 text-right hidden sm:table-cell" colSpan="5">
              মোট মুল্যঃ {`(টাকা)`}
            </td>
            <td className="p-2">
              {replaceNumbers(
                (data?.deliveryCharge + data?.orderPrice).toString(),
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const Item = ({ data }) => {
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <th
          scope="row"
          className="p-2 font-medium text-gray-900 whitespace-nowrap dark:text-white w-1/12"
        >
          {data.orderItemNo}
        </th>
        <td className="p-2 w-2/12">
          <Imagecustom src={data.thumbnail} w={50} h={50} alt={data?.title} />
        </td>
        <td className="p-2 sm:w-4/12 w-8/12 text-gray-900 dark:text-white ">
          <p className="line-clamp-2"> {data.productName}</p>
          <p className="sm:hidden text-[10px] dark:text-gray-400">
            মুল্যঃ {replaceNumbers(data?.price.toString())} X পরিমান{" "}
            {replaceNumbers(data?.quantity.toString())}
          </p>
        </td>
        <td className="p-2 hidden sm:table-cell w-2/12">
          {replaceNumbers(data?.price?.toString())}
        </td>
        <td className="p-2 hidden sm:table-cell w-2/12">
          {replaceNumbers(data?.quantity.toString())}
        </td>
        <td className="p-2 w-2/12">
          {replaceNumbers((data?.price * data?.quantity).toString())}
        </td>
      </tr>
    </>
  );
};
