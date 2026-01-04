/**
 * Date grouping utilities for receipts
 * Groups receipts by relative time periods (today, yesterday, this week, etc.)
 */

export type DateGroup =
  | "today"
  | "yesterday"
  | "this-week"
  | "last-week"
  | "this-month"
  | "older";

export interface DateGroupInfo {
  key: DateGroup;
  label: string;
}

export const DATE_GROUPS: Record<DateGroup, DateGroupInfo> = {
  today: { key: "today", label: "Today" },
  yesterday: { key: "yesterday", label: "Yesterday" },
  "this-week": { key: "this-week", label: "This Week" },
  "last-week": { key: "last-week", label: "Last Week" },
  "this-month": { key: "this-month", label: "This Month" },
  older: { key: "older", label: "Older" },
};

/** Order in which groups should be displayed */
export const DATE_GROUP_ORDER: DateGroup[] = [
  "today",
  "yesterday",
  "this-week",
  "last-week",
  "this-month",
  "older",
];

/**
 * Determines which relative date group a date belongs to.
 * Uses Monday as week start (consistent with lib/reports.ts).
 */
export function getDateGroup(date: Date | string | number | null): DateGroup {
  if (!date) return "older";

  const now = new Date();
  const receiptDate = new Date(date);

  // Normalize to start of day (local time)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const receiptDay = new Date(
    receiptDate.getFullYear(),
    receiptDate.getMonth(),
    receiptDate.getDate()
  );

  // Today
  if (receiptDay.getTime() === today.getTime()) {
    return "today";
  }

  // Yesterday
  if (receiptDay.getTime() === yesterday.getTime()) {
    return "yesterday";
  }

  // Calculate week boundaries (Monday start)
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - diffToMonday);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(thisWeekStart.getDate() - 7);

  // This Week (but not today/yesterday)
  if (receiptDay >= thisWeekStart && receiptDay < yesterday) {
    return "this-week";
  }

  // Last Week
  if (receiptDay >= lastWeekStart && receiptDay < thisWeekStart) {
    return "last-week";
  }

  // This Month (but not in current or last week)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (receiptDay >= thisMonthStart && receiptDay < lastWeekStart) {
    return "this-month";
  }

  return "older";
}

/**
 * Groups receipts by relative date.
 * Returns a Map preserving display order (today first, older last).
 * Empty groups are omitted.
 */
export function groupReceiptsByDate<T extends { date: Date | string | number | null }>(
  receipts: T[]
): Map<DateGroup, T[]> {
  const groups = new Map<DateGroup, T[]>();

  // Initialize all groups in display order
  DATE_GROUP_ORDER.forEach((key) => groups.set(key, []));

  // Group receipts
  receipts.forEach((receipt) => {
    const group = getDateGroup(receipt.date);
    groups.get(group)!.push(receipt);
  });

  // Remove empty groups
  DATE_GROUP_ORDER.forEach((key) => {
    if (groups.get(key)!.length === 0) {
      groups.delete(key);
    }
  });

  return groups;
}
