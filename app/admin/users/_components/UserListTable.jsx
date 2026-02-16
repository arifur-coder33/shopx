import { dateConvertToLocalString } from "@/utils/dateConvert";
import { Edit, Eye, Trash } from "lucide-react";
import Link from "next/link";

import DeleteItem from "@/components/common/DeleteItem";

import { deleteUserById } from "@/backend/serverActions/authActions";

export default function UserListTable({ data }) {
  return (
    <>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Sl No.
              </th>
              <th scope="col" className="px-6 py-3">
                photo
              </th>
              {/* <th scope="col" className="px-6 py-3">
                Image
              </th> */}
              <th scope="col" className="px-6 py-3">
                name
              </th>
              <th scope="col" className="px-6 py-3">
                email
              </th>
              <th scope="col" className="px-6 py-3">
                Phone Number
              </th>

              <th scope="col" className="px-6 py-3">
                Joning date
              </th>
              <th scope="col" className="px-6 py-3">
                Role
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
              data?.map((item, i) => (
                <Item key={i} data={item} index={i + 1} />
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const Item = ({ data, index }) => {
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <td className="px-6 py-4">{index}</td>
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          -
        </th>
        {/* <td className="px-6 py-4">
          <Imagecustom src={data?.images[0]} w={50} h={50} alt={data?.title} />
        </td> */}
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {data.name}
        </th>
        <td className="px-6 py-4">{data?.email}</td>
        <td className="px-6 py-4">{data?.phone}</td>
        <td className="px-6 py-4">
          {" "}
          {dateConvertToLocalString(data?.createdAt)}
        </td>

        <td className="px-6 py-4">{data?.role?.name}</td>
        <td className="px-6 py-4">{data?.status}</td>

        <td className="px-6 py-4 flex flex-row gap-2">
          <Link href={`/admin/user/view/${data?.id}}`}>
            <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <Link href={`/admin/user/edit/${data?.id}`}>
            <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <DeleteItem deleteItem={deleteUserById} id={data?.id}>
            <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
          </DeleteItem>
        </td>
      </tr>
    </>
  );
};
