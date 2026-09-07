"use client";
import { useId, useState } from "react";

export default function PasswordInput({
  label,
  name,
  colSpan,
  required,
  isEditable,
  type,
  ...props
}) {
  const [show, setShow] = useState(false);

  const reactId = useId();
  const uniqueId = `input-${name}-${reactId.replace(/:/g, "")}`;

  return (
    <div className={`relative my-4 col-span-${colSpan}`}>
      <input
        disabled={isEditable === false}
        type={show ? "text" : "password"}
        id={uniqueId}
        name={name}
        placeholder=" "
        minLength={4}
        required={required}
        className="block px-1 pt-4 bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:text-white appearance-none focus:outline-none focus:ring-2 peer"
        {...props}
      />

      {/* Floating Label */}
      <label
        htmlFor={uniqueId}
        className="absolute rounded-md text-slate-500 bg-slate-200 dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0] px-2 
        peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 
        peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 
        peer-focus:text-blue-600 peer-focus:dark:text-slate-200 start-1"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Show / Hide Button */}
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 dark:text-gray-300"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
