"use client";

import { useId } from "react";

export default function FloatingInput({
  modal,
  label,
  name,
  inputType = "text",
  colSpan,
  required,
  isEditable,
  largeMobile = false,

  ...props
}) {
  const reactId = useId();
  const uniqueId = `input-${name}-${reactId.replace(/:/g, "")}`;

  return (
    <div
      className={`relative 
      col-span-${colSpan}`}
    >
      <input
        disabled={isEditable === false}
        type={inputType}
        className={`block px-1 ${largeMobile ? "text-xl md:text-lg" : "text-lg"} bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500  w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500  appearance-none focus:outline-none focus:ring-2 peer
            user-invalid:border-red-500
            user-invalid:blink-border
              user-invalid:border-2
    user-invalid:focus:border-red-500
    user-invalid:focus:ring-red-500
        `}
        id={uniqueId}
        name={name}
        placeholder=""
        {...props}
        required={required}
      />
      <label
        htmlFor={uniqueId}
        className={`absolute rounded-md text-slate-500 ${largeMobile ? "text-xl md:text-lg" : "text-lg"} bg-slate-200 dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0] px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    </div>
  );
}
