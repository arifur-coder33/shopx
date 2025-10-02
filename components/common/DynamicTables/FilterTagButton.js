// components/common/DynamicTable/FilterTagButton.js
import { memo } from "react";

const FilterTagButton = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-2 md:py-1 text-[8px] md:text-sm rounded-full transition-all duration-200 ${
        isActive
          ? "bg-purple text-white shadow-md hover:bg-purple"
          : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700  dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
};

export default memo(FilterTagButton);
