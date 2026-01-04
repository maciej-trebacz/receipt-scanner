"use client";

import { cn } from "@/lib/utils";

interface SpendingChartItem {
  label: string;
  value: number;
  percentage: number;
}

interface SpendingChartProps {
  data: SpendingChartItem[];
  formatValue?: (value: number) => string;
  className?: string;
}

export function SpendingChart({
  data,
  formatValue = (v) => `${v.toFixed(2)} PLN`,
  className,
}: SpendingChartProps) {
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-12 text-muted-foreground", className)}>
        No data available for this period
      </div>
    );
  }

  const maxPercentage = Math.max(...data.map((d) => d.percentage));

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((item, index) => (
        <div key={item.label} className="group">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold capitalize truncate max-w-[60%]">
              {item.label}
            </span>
            <span className="text-sm font-black tabular-nums">
              {formatValue(item.value)}
            </span>
          </div>
          <div className="h-8 bg-muted/30 rounded-xl overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-xl transition-all duration-700 ease-out flex items-center justify-end pr-3"
              style={{
                width: `${Math.max((item.percentage / maxPercentage) * 100, 8)}%`,
                animationDelay: `${index * 50}ms`,
              }}
            >
              <span className="text-xs font-bold text-primary-foreground opacity-90">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
