import { getProducts } from "@/backend/serverActions/productActions";

export default async function ProductListTable() {
  const data = await getProducts();
  console.log(data);
  return (
    <>
      <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
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
            {data.data.length > 0 &&
              data.data.map((item) => <Item key={item.id} data={item} />)}
          </tbody>
        </table>
      </div>
    </>
  );
}

const Item = ({data}) => {
  
  return (
    <>
      <tr className="odd:bg-white odd:dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800 border-b dark:border-gray-700">
        <th
          scope="row"
          className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white"
        >
     {data.title}
        </th>
        <td className="px-6 py-4">{data?.color}</td>
        <td className="px-6 py-4">{}</td>
        <td className="px-6 py-4">{data?.discountPrice}</td>
        <td className="px-6 py-4">
          <a
            href="#"
            className="font-medium text-blue-600 dark:text-blue-500 hover:underline"
          >
            Edit
          </a>
        </td>
      </tr>
    </>
  );
};
