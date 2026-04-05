import { getAllCategoryWithproduct } from "@/backend/serverActions/catagoryActions";
import { Edit, Eye, Trash } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import DeleteItem from "../common/DeleteItem";
import Imagecustom from "../images/ImageCustom";

const getData = unstable_cache(
  async () => {
    const data = await getAllCategoryWithproduct();

    return data;
  },
  ["category"],
  { revalidate: 3600, tags: ["category"] },
);
export default async function CategoryListTable() {
  const { data } = await getData();

  return (
    <>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Image
              </th>
              <th scope="col" className="px-6 py-3">
                Category name
              </th>
              <th scope="col" className="px-6 py-3">
                slug
              </th>
              <th scope="col" className="px-6 py-3">
                Total Product
              </th>
              <th scope="col" className="px-6 py-3">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.length > 0 &&
              data.map((item) => <Item key={item?.id} data={item} />)}
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
        <td className="px-6 py-4">
          <Imagecustom src={data?.image} w={50} h={50} alt={data?.name} />
        </td>
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {data.name}
        </th>
        <td className="px-6 py-4">{data?.slug}</td>
        <td className="px-6 py-4">{data?._count.products}</td>
        <td className="px-6 py-4 grid grid-cols-3">
          <Link href={`/category/${encodeURIComponent(data?.slug)}`}>
            <Eye className="hover:text-brand-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <Link href={`/admin/category/edit/${data?.id}`}>
            <Edit className="hover:text-brand-500 hover:scale-105 transition cursor-pointer" />
          </Link>

          <DeleteItem deleteItem={""} id={data?.id}>
            <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
          </DeleteItem>
        </td>
      </tr>
    </>
  );
};
