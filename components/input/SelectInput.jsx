"use client";
import { useState } from "react";

export default function SelectInput({ ...props }) {
  const [value, setValue] = useState(props?.defaultValue || "-");
  const handleChange = (e) => {
    setValue(e.target.value);
  };
  return (
    <>
      <label
        htmlFor={props?.name}
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
      >
        {props?.label}
      </label>
      <select
        {...props}
        // defaultValue={value} // Bind the selected value to state
        // onChange={(e) => handleChange(e)}
        // name={name}
        // id={name}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      >
        <option disabled value={"-"}>
          Choose a Item
        </option>
        {props?.data?.length > 0 &&
          props?.data?.map((item) => (
            <option key={item.id} value={item?.id}>
              {item.name}
            </option>
          ))}
      </select>
    </>
  );
}
