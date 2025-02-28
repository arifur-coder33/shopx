"use client";
import { useEffect, useState } from "react";

export default function CheckBox({ label, name, value, colSpan, action, id }) {
  const [uniqueId, setUniqueId] = useState();
  const [checked, setChecked] = useState(value ?? false); // Manage checkbox state

  useEffect(() => {
    setUniqueId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    setChecked(value); // Sync state with prop when it changes
  }, [value]);

  const handleChange = async () => {
    if (action) {
      const userConfirm = confirm("Are you sure?");
      if (userConfirm) {
        setChecked(!checked); // Update state only if confirmed
        if (action) {
          await action({ id, value: !checked });
        }
      }
    } else {
      setChecked(!checked);
    }
  };

  return (
    <div className={`my-3 col-span-${colSpan}`}>
      <div className="flex items-center">
        <input
          onChange={handleChange}
          name={name}
          id={uniqueId}
          type="checkbox"
          defaultChecked={checked} // Controlled component
          className="w-4 h-4 cursor-pointer text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
        />
        <label
          htmlFor={uniqueId}
          className="cursor-pointer ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
        >
          {label}
        </label>
      </div>
    </div>
  );
}
