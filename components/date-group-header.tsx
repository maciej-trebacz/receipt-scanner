"use client";

import { DateGroup, DATE_GROUPS } from "@/lib/date-groups";

interface DateGroupHeaderProps {
  group: DateGroup;
  count?: number;
}

export function DateGroupHeader({ group, count }: DateGroupHeaderProps) {
  const info = DATE_GROUPS[group];

  return (
    <div className="sticky top-16 md:top-0 z-10 py-3 px-1 -mx-1 mb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
          {info.label}
        </h2>
        {count !== undefined && (
          <span className="text-[10px] font-bold text-muted-foreground/60">
            {count} {count === 1 ? "receipt" : "receipts"}
          </span>
        )}
      </div>
    </div>
  );
}
