"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DateRange as DayPickerRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/lib/hooks/use-receipts";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey =
  | "all"
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "last-month";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this-week", label: "This Week" },
  { key: "last-week", label: "Last Week" },
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
];

function getPresetDates(preset: PresetKey): DateRange {
  const now = new Date();
  const today = format(now, "yyyy-MM-dd");

  switch (preset) {
    case "all":
      return { startDate: null, endDate: null };
    case "today":
      return { startDate: today, endDate: today };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yStr = format(yesterday, "yyyy-MM-dd");
      return { startDate: yStr, endDate: yStr };
    }
    case "this-week": {
      // Monday start
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - diff);
      return {
        startDate: format(weekStart, "yyyy-MM-dd"),
        endDate: today,
      };
    }
    case "last-week": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - diff);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
      return {
        startDate: format(lastWeekStart, "yyyy-MM-dd"),
        endDate: format(lastWeekEnd, "yyyy-MM-dd"),
      };
    }
    case "this-month": {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: format(monthStart, "yyyy-MM-dd"),
        endDate: today,
      };
    }
    case "last-month": {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: format(lastMonthStart, "yyyy-MM-dd"),
        endDate: format(lastMonthEnd, "yyyy-MM-dd"),
      };
    }
  }
}

function getActivePreset(value: DateRange): PresetKey | null {
  if (!value.startDate && !value.endDate) return "all";

  for (const preset of PRESETS) {
    const presetDates = getPresetDates(preset.key);
    if (
      presetDates.startDate === value.startDate &&
      presetDates.endDate === value.endDate
    ) {
      return preset.key;
    }
  }
  return null;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  // Convert our DateRange to react-day-picker's DateRange
  const calendarValue: DayPickerRange | undefined =
    value.startDate || value.endDate
      ? {
          from: value.startDate ? new Date(value.startDate) : undefined,
          to: value.endDate ? new Date(value.endDate) : undefined,
        }
      : undefined;

  const handlePresetSelect = (preset: PresetKey) => {
    const dates = getPresetDates(preset);
    onChange(dates);
    setOpen(false);
  };

  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    if (!range) {
      onChange({ startDate: null, endDate: null });
      return;
    }
    onChange({
      startDate: range.from ? format(range.from, "yyyy-MM-dd") : null,
      endDate: range.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ startDate: null, endDate: null });
    setOpen(false);
  };

  const hasFilter = value.startDate || value.endDate;
  const activePreset = getActivePreset(value);

  // Format display label
  let displayLabel = "All dates";
  if (hasFilter) {
    if (activePreset && activePreset !== "all") {
      displayLabel = PRESETS.find((p) => p.key === activePreset)?.label ?? "";
    } else if (value.startDate && value.endDate) {
      if (value.startDate === value.endDate) {
        displayLabel = format(new Date(value.startDate), "MMM d, yyyy");
      } else {
        displayLabel = `${format(new Date(value.startDate), "MMM d")} - ${format(new Date(value.endDate), "MMM d, yyyy")}`;
      }
    } else if (value.startDate) {
      displayLabel = `From ${format(new Date(value.startDate), "MMM d, yyyy")}`;
    } else if (value.endDate) {
      displayLabel = `Until ${format(new Date(value.endDate), "MMM d, yyyy")}`;
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
            hasFilter
              ? "bg-primary/10 text-primary border border-primary/20"
              : "glass hover:bg-muted/50"
          )}
        >
          <HugeiconsIcon icon={Calendar03Icon} className="size-4" />
          <span className="truncate max-w-[160px]">{displayLabel}</span>
          {hasFilter && (
            <button
              onClick={handleClear}
              className="ml-1 hover:text-destructive transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-3" />
            </button>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets sidebar */}
          <div className="flex flex-col gap-1 p-3 border-r border-border/50">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => handlePresetSelect(preset.key)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium text-left transition-all whitespace-nowrap",
                  activePreset === preset.key
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={calendarValue}
              onSelect={handleCalendarSelect}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
