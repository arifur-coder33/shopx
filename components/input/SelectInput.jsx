export default function SelectInput({ name, label, data }) {
  return (
    <>
      <label
        htmlFor={name}
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        {label}
      </label>
      <select
        name={name}
        id={name}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      >
        <option value={"-"} disabled selected={true}>
          Choose a country
        </option>
        {data?.length > 0 &&
          data?.map((item) => (
            <option key={item} value={item.id}>
              {item.name}
            </option>
          ))}
      </select>
    </>
  );
}
