// "use client";
// import { useState } from "react";

// export default function SelectInput({ defaultValue, ...restProps }) {
//   const [value, setValue] = useState(defaultValue || "-");
//   const handleChange = (e) => {
//     setValue(e.target.value);
//   };
//   return (
//     <>
//       <label
//         htmlFor={restProps?.name}
//         className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
//       >
//         {restProps?.label}
//       </label>
//       <select
//         {...restProps}
//         defaultValue={value} // Bind the selected value to state
//         onChange={(e) => handleChange(e)}
//         // name={name}
//         // id={name}
//         className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
//       >
//         <option disabled defaultValue={"-"}>
//           Choose a Item
//         </option>
//         {restProps?.data?.length > 0 &&
//           restProps?.data?.map((item) => (
//             <option key={item.id} value={item?.id}>
//               {item.name}
//             </option>
//           ))}
//       </select>
//     </>
//   );
// }
"use client";
import { useState } from "react";

export default function SelectInput({ defaultValue, onChange, ...restProps }) {
  const [value, setValue] = useState(defaultValue || "-");

  const handleChange = (e) => {
    setValue(e.target.value);
    if (onChange) {
      onChange(e); // ✅ call the parent onChange
    }
  };

  return (
    <>
      <label
        htmlFor={restProps?.name}
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        {restProps?.label}
      </label>
      <select
        {...restProps}
        value={value}
        onChange={handleChange} // ✅ use the combined handler
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg 
                   focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 
                   dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                   dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      >
        <option disabled value="-">
          Choose an Item
        </option>
        {restProps?.data?.length > 0 &&
          restProps?.data?.map((item) => (
            <option key={item.id} value={item?.id}>
              {item.name}
            </option>
          ))}
      </select>
    </>
  );
}
