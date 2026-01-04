"use client";

import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

export type Period = "week" | "month" | "year" | "all";

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  offset: number;
  onOffsetChange: (offset: number) => void;
  periodLabel?: string;
  className?: string;
}

const periods: { value: Period; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All" },
];

export function PeriodSelector({
  value,
  onChange,
  offset,
  onOffsetChange,
  periodLabel,
  className,
}: PeriodSelectorProps) {
  const canGoNext = offset < 0;
  const canGoPrev = value !== "all"; // Can always go back except for "all"

  const handlePrev = () => {
    if (canGoPrev) {
      onOffsetChange(offset - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onOffsetChange(offset + 1);
    }
  };

  const handlePeriodChange = (newPeriod: Period) => {
    onChange(newPeriod);
    onOffsetChange(0); // Reset to current period when changing period type
  };

  return (
    <div className={cn("flex flex-col items-end gap-2", className)}>
      {/* Period type selector */}
      <div className="inline-flex p-1 rounded-2xl bg-muted/50 glass">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => handlePeriodChange(period.value)}
            className={cn(
              "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300",
              value === period.value
                ? "bg-primary text-primary-foreground shadow-lg"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {period.label}
          </button>
        ))}
      </div>

      {/* Navigation arrows with period label */}
      {value !== "all" && (
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center transition-all",
              canGoPrev
                ? "text-foreground hover:bg-muted/50 active:scale-95"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          </button>

          {periodLabel && (
            <span className="text-sm font-bold text-foreground min-w-[140px] text-center">
              {periodLabel}
            </span>
          )}

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={cn(
              "size-8 rounded-lg flex items-center justify-center transition-all",
              canGoNext
                ? "text-foreground hover:bg-muted/50 active:scale-95"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
