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
  ...props
}) {
  const uniqueId = `input-${name}`;
  const [error, setError] = useState("");

  const handlePhoneValidation = (e) => {
    if (name !== "phoneNumber") return;

    const value = e.target.value.replace(/\D/g, "");
    e.target.value = value;

    if (value.length === 0) {
      setError("");
      return;
    }

    if (!/^01[3-9]\d{8}$/.test(value)) {
      setError("সঠিক বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)");
    } else {
      setError("");
    }
  };

  return (
    <div className={`relative my-4 col-span-${colSpan}`}>
      <input
        disabled={isEditable === false}
        type={inputType}
        id={uniqueId}
        name={name}
        maxLength={max}
        minLength={min}
        placeholder=""
        onChange={handlePhoneValidation}
        className={`block px-1 pt-4 text-xl bg-slate-200 border rounded-lg w-full p-2.5 appearance-none focus:outline-none focus:ring-2 peer
          ${
            error
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        {...props}
      />

      <label
        htmlFor={uniqueId}
        className="absolute rounded-md text-slate-500 text-2xl bg-slate-200 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0] px-2 peer-placeholder-shown:scale-100 peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 start-1"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {error && <p className="mt-1 ml-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
