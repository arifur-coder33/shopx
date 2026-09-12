"use client";

import { useState } from "react";

export default function PhoneInput({
  modal,
  label,
  name,
  inputType = "text",
  colSpan,
  required,
  isEditable,
  max,
  min,
  largeMobile = false,
  ...props
}) {
  const uniqueId = `input-${name}`;
  const [error, setError] = useState("");
  const handlePhoneValidation = (e) => {
    if (name !== "phoneNumber") return;

    let value = e.target.value.replace(/\D/g, "");

    if (value.length > 13) {
      value = value.slice(0, 13);
    }

    e.target.value = value;

    if (value.length === 0) {
      setError("");
      return;
    }

    const validBDNumber =
      /^01[3-9]\d{8}$/.test(value) || /^8801[3-9]\d{8}$/.test(value);

    if (!validBDNumber) {
      setError(
        "সঠিক বাংলাদেশি মোবাইল নম্বর দিন (01712345678 অথবা 8801712345678)",
      );
      e.target.setCustomValidity("Invalid phone number");
    } else {
      setError("");
      e.target.setCustomValidity("");
    }
  };
  return (
    <div className={`relative  col-span-${colSpan}`}>
      <input
        disabled={isEditable === false}
        type={inputType}
        id={uniqueId}
        name={name}
        maxLength={name === "phoneNumber" ? 13 : max}
        minLength={min}
        placeholder=""
        onChange={handlePhoneValidation}
        required={required}
        className={`block px-1 ${largeMobile ? "text-xl md:text-lg" : "text-base"} bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500  w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500  appearance-none focus:outline-none focus:ring-2 peer
               user-invalid:border-red-500
              user-invalid:border-2
                     user-invalid:blink-border
    user-invalid:focus:border-red-500
    user-invalid:focus:ring-red-500
          ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        {...props}
      />

      <label
        htmlFor={uniqueId}
        className={`absolute rounded-md text-slate-500 ${largeMobile ? "text-xl md:text-lg" : "text-base"} bg-slate-200 dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0] px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {error && <p className="mt-1 ml-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
