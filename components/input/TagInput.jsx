import { useEffect, useState } from "react";

export default function TagInput({
  modal,
  label,
  name,
  colSpan,
  defaultValue = "",
  onChange,
  ...props
}) {
  const uniqueId = `input-${name}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;

  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState("");
  console.log("defaultValue", defaultValue);
  useEffect(() => {
    if (defaultValue.length > 0) {
      setTags(
        defaultValue
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag !== "")
      );
    } else {
      setTags([]);
    }
  }, [defaultValue]);
  useEffect(() => {
    if (inputValue.trim() === "") return;

    const timer = setTimeout(() => {
      // Simulate Enter key
      handleKeyDown({ key: "Enter", preventDefault: () => {} });
    }, 2000); // 2 seconds

    return () => clearTimeout(timer); // Clear timer on input change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleInputChange = (e) => {
    console.log("inputValue", e.target.value);
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === "," || (e.key === "Enter" && inputValue.trim() !== "")) {
      e.preventDefault();

      const newTags = inputValue
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "" && !tags.includes(tag)); // Split by comma and filter

      if (newTags.length > 0) {
        const updatedTags = [...tags, ...newTags]; // Add all new tags
        setTags(updatedTags);
        setInputValue("");

        if (onChange) {
          onChange(updatedTags.join(", "));
        }
      } else {
        setInputValue("");
      }
    }
  };

  const removeTag = (tagToRemove) => {
    const updatedTags = tags.filter((tag) => tag !== tagToRemove);
    setTags(updatedTags);

    if (onChange) {
      onChange(updatedTags.join(", "));
    }
  };

  const renderTags = () => {
    //Split value by comma, remove current tags
    const inputValueTags = inputValue
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    return (
      <div className="flex flex-wrap gap-2">
        {inputValueTags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center rounded-full bg-blue-500 text-white text-sm font-medium py-1 px-2"
          >
            {tag}
          </span>
        ))}

        {tags.map((tag, index) => (
          <span
            key={`tag-${index}`}
            className=" inline-flex items-center rounded-full bg-blue-500 text-white text-sm font-medium py-1 px-2"
          >
            {tag}
            <button
              type="button"
              className="ml-1 text-red-400 bg-rd hover:text-red-500 focus:outline-none "
              onClick={() => removeTag(tag)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className={`my-3 col-span-${colSpan}`}>
      <div className={`relative `}>
        <input
          {...props}
          type="text"
          className="block px-1  pt-4 text-base bg-slate-200 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500  w-full p-2.5 dark:bg-slate-600 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500  appearance-none focus:outline-none focus:ring-2 peer"
          id={uniqueId}
          name={name}
          placeholder=""
          value={inputValue}
          onChange={(event) => {
            handleInputChange(event);
          }}
          onKeyDown={handleKeyDown}
        />
        <label
          htmlFor={uniqueId}
          className="absolute rounded-md text-slate-500 text-base bg-slate-200  dark:bg-slate-600 dark:text-gray-400 duration-300 transform -translate-y-4 scale-75 top-2 origin-[0]   px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-focus:dark:text-slate-200 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
        >
          {label}
        </label>
      </div>
      <div className="mt-2">
        <span>{renderTags()}</span>
      </div>
    </div>
  );
}
