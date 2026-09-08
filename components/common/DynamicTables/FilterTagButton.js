// components/common/DynamicTable/FilterTagButton.js
import { memo } from "react";

const FilterTagButton = ({ label, isActive, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-8 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-150 ${
        isActive
          ? "bg-brand text-white shadow-md hover:bg-brand"
          : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700  dark:hover:bg-gray-600"
      }`}
    >
      {label}
    </button>
  );
};

export default memo(FilterTagButton);
