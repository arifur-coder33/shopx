import { getCategory } from "@/backend/serverActions/catagoryActions";
import {
  deleteProductById,
  getProducts,
} from "@/backend/serverActions/productActions";
import { Edit, Eye, Trash } from "lucide-react";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import DeleteItem from "../common/DeleteItem";
import Imagecustom from "../images/ImageCustom";
import ModalButton from "../modal/ModalBUtton";
import ProductForm from "./ProductForm";

const getData = unstable_cache(
  async () => {
    const data = await getProducts();

    return data;
  },
  ["products"],
  { revalidate: 3600, tags: ["products"] }
);

export default async function ProductListTable() {
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
                Product name
              </th>
              <th scope="col" className="px-6 py-3">
                Color
              </th>
              <th scope="col" className="px-6 py-3">
                Category
              </th>
              <th scope="col" className="px-6 py-3">
                Price
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

const Item = async ({ data }) => {
  const getCat = await getCategory();
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <td className="px-6 py-4">
          <Imagecustom src={data?.mainImage} w={50} h={50} alt={data?.title} />
        </td>
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
          {data.title}
        </th>
        <td className="px-6 py-4">{data?.color}</td>
        <td className="px-6 py-4">{data?.category?.name}</td>
        <td className="px-6 py-4">{data?.discountPrice}</td>
        {/* <td className="px-6 py-4">
          <Link
          prefetch={false}
            href={`/admin/product/edit/${data?.id}`}
            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >
            Edit
          </Link>
        </td> */}
        <td className="px-6 py-4 grid grid-cols-3">
          <Link href={`/product/${encodeURIComponent(data?.slug)}`}>
            <Eye className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <Link href={`/admin/product/edit/${data?.id}`}>
            <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
          </Link>
          <ModalButton
            buttonName={
              <Edit className="hover:text-purple-500 hover:scale-105 transition cursor-pointer" />
            }
          >
            <ProductForm
              actionType={"edit"}
              category={getCat?.data}
              data={data}
            />
          </ModalButton>
          <DeleteItem deleteItem={deleteProductById} id={data?.id}>
            <Trash className="text-red-500 hover:scale-105 transition cursor-pointer" />
          </DeleteItem>
        </td>
      </tr>
    </>
  );
};
