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
import { useEffect, useMemo, useState } from "react";
import FilterTagButton from "./FilterTagButton";

// Helper hook for responsiveness
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [matches, query]);

  return matches;
}

export default function TimeFilter({
  activeTimeFilter,
  onTimeChange,
  options = [],
}) {
  // --- FIX: This state now represents the single source of truth for the calendar's display ---
  const [dateRange, setDateRange] = useState();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const numberOfMonths = isDesktop ? 2 : 1;

  const presetOptions = useMemo(
    () => options.filter((opt) => opt !== "Custom"),
    [options]
  );
  const showCustomRangePicker = useMemo(
    () => options.includes("Custom"),
    [options]
  );

  const { selectedPreset, selectedCustomRange } = useMemo(() => {
    let preset = null;
    let customRange = undefined;

    if (typeof activeTimeFilter === "string") {
      preset = activeTimeFilter;
    } else if (activeTimeFilter?.type === "custom") {
      customRange = {
        from: new Date(activeTimeFilter.startDate),
        to: new Date(activeTimeFilter.endDate),
      };
    }

    if (!preset && !customRange) {
      preset = "ALL";
    }

    return { selectedPreset: preset, selectedCustomRange: customRange };
  }, [activeTimeFilter]);

  // --- FIX: This effect synchronizes the local state with the parent's prop ---
  // When the active filter changes (e.g., a custom range is applied or cleared),
  // this ensures the calendar's internal state is updated to match.
  useEffect(() => {
    setDateRange(selectedCustomRange);
  }, [selectedCustomRange]);

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
      setIsPopoverOpen(false);
    }
  };

  const handleClearCustomDate = () => {
    setDateRange(undefined);
    onTimeChange("ALL");
    setIsPopoverOpen(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mr-2">
        Time:
      </span>
      {presetOptions.map((option) => (
        <FilterTagButton
          key={option}
          label={option}
          isActive={selectedPreset === option}
          onClick={() => handlePresetClick(option)}
        />
      ))}

      {showCustomRangePicker && (
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
          <PopoverContent
            className="w-auto p-0 bg-white dark:bg-gray-800"
            align="start"
            collisionPadding={16}
          >
            <Calendar
              className={" md:max-h-64 overflow-scroll"}
              classNames={{
                today: `border-cyan-500 border-2 rounded-full`, // Add a border to today's date
                selected: `bg-cyan-300 border-cyan-500 `, // Highlight the selected day
              }}
              mode="range"
              // --- FIX: Use our synchronized state directly ---
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={numberOfMonths}
            />
            <div className="p-2 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2 ">
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
      )}
    </div>
  );
}
