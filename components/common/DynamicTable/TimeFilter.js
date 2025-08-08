// components/common/DynamicTable/TimeFilter.js
"use client";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { endOfDay, format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import FilterTagButton from "./FilterTagButton";

const TIME_OPTIONS = ["last 24 hours", "last 7 days", "last 30 days"];

export default function TimeFilter({ activeTimeFilter, onTimeChange }) {
  const [dateRange, setDateRange] = useState();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const selectedPreset = useMemo(() => {
    if (typeof activeTimeFilter === "string") {
      return activeTimeFilter;
    }
    return null;
  }, [activeTimeFilter]);

  const selectedCustomRange = useMemo(() => {
    if (activeTimeFilter?.type === "custom") {
      return {
        from: new Date(activeTimeFilter.startDate),
        to: new Date(activeTimeFilter.endDate),
      };
    }
    return undefined;
  }, [activeTimeFilter]);

  const handlePresetClick = (option) => {
    const newFilter = selectedPreset === option ? "ALL" : option;
    onTimeChange(newFilter);
  };

  const handleApplyCustomDate = () => {
    if (dateRange?.from && dateRange?.to) {
      const adjustedEndDate = endOfDay(dateRange.to);

      onTimeChange({
        type: "custom",
        startDate: dateRange.from.toISOString(),
        endDate: adjustedEndDate.toISOString(),
      });
      // 3. Close the popover on apply
      setIsPopoverOpen(false);
    }
  };

  const handleClearCustomDate = () => {
    setDateRange(undefined);
    onTimeChange("ALL");
    // 4. Close the popover on clear
    setIsPopoverOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
        Time:
      </span>
      {TIME_OPTIONS.map((option) => (
        <FilterTagButton
          key={option}
          label={option}
          isActive={selectedPreset === option}
          onClick={() => handlePresetClick(option)}
        />
      ))}

      {/* 2. Make the Popover a controlled component */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={`px-3 py-1 text-sm rounded-full flex items-center gap-2 transition-all duration-200 ${
              selectedCustomRange
                ? "bg-purple-600 text-white shadow-md hover:bg-purple-700"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            {selectedCustomRange ? (
              `${format(selectedCustomRange.from, "LLL dd, y")} - ${format(
                selectedCustomRange.to,
                "LLL dd, y"
              )}`
            ) : (
              <span>Custom Range</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={selectedCustomRange?.from}
            selected={dateRange ?? selectedCustomRange}
            onSelect={setDateRange}
            numberOfMonths={2}
          />
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleClearCustomDate}
              className="px-3 py-1 text-sm rounded-md bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              Clear
            </button>
            <button
              onClick={handleApplyCustomDate}
              disabled={!dateRange?.from || !dateRange?.to}
              className="px-3 py-1 text-sm rounded-md bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
