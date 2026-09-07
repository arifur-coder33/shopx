"use client";

import { useId } from "react";

export default function DefaultInput({
  colSpan,
  value,
  name,
  label,
  type,
  placeholder,
  required,
}) {
  const reactId = useId();
  const uniqueId = `input-${name}-${reactId.replace(/:/g, "")}`;
  return (
    <div className={`${colSpan} mt-3`}>
      <label
        htmlFor={uniqueId}
        className="block  text-sm font-medium text-slate-200 dark:text-white"
      >
        {label}
      </label>
      <input
        defaultValue={value}
        type={type}
        name={name}
        id={uniqueId}
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
