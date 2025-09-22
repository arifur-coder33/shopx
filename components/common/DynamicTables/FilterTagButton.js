// components/common/DynamicTable/FilterTagButton.js
import { memo } from "react";

const FilterTagButton = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-sm rounded-full transition-all duration-200 ${
        isActive
          ? "bg-purple-600 text-white shadow-md hover:bg-purple-700"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
};

export default memo(FilterTagButton);
