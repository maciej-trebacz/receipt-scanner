import { db, receipts, receiptItems } from "./db";
import { sql, gte, lt, desc } from "drizzle-orm";

export type Period = "week" | "month" | "year" | "all";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export interface Summary {
  totalSpent: number;
  receiptCount: number;
  itemCount: number;
  avgPerReceipt: number;
}

export interface ProductTypeBreakdown {
  productType: string;
  totalSpent: number;
  itemCount: number;
  percentage: number;
}

export interface StoreBreakdown {
  storeName: string;
  totalSpent: number;
  receiptCount: number;
}

export interface DayBreakdown {
  date: string;
  totalSpent: number;
}

export interface ReportsData {
  period: DateRange;
  summary: Summary;
  byProductType: ProductTypeBreakdown[];
  byStore: StoreBreakdown[];
  byDay: DayBreakdown[];
}

export function getDateRange(period: Period, offset: number = 0): DateRange {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  switch (period) {
    case "week": {
      // Start of current week (Monday)
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
      start = new Date(now);
      start.setDate(now.getDate() - diff + offset * 7);
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 7);

      // Format: "Jan 6 - Jan 12, 2025"
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endDisplay = new Date(end);
      endDisplay.setDate(endDisplay.getDate() - 1); // Show last day of week, not first day of next
      const endStr = endDisplay.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      label = `${startStr} - ${endStr}`;
      break;
    }
    case "month": {
      start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
      label = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      break;
    }
    case "year": {
      start = new Date(now.getFullYear() + offset, 0, 1);
      end = new Date(now.getFullYear() + offset + 1, 0, 1);
      label = start.getFullYear().toString();
      break;
    }
    case "all":
    default: {
      start = new Date(0);
      end = new Date(now.getTime() + 86400000); // tomorrow to include today
      label = "All Time";
      break;
    }
  }

  // For current period (offset 0), use now as end to not show future
  if (offset === 0 && period !== "all") {
    end = new Date(now.getTime() + 86400000); // tomorrow to include today
  }

  return {
    start,
    end,
    label,
  };
}

export async function getSummary(start: Date, end: Date): Promise<Summary> {
  // Database stores dates in seconds, not milliseconds
  const startSeconds = Math.floor(start.getTime() / 1000);
  const endSeconds = Math.floor(end.getTime() / 1000);

  const result = await db
    .select({
      totalSpent: sql<number>`COALESCE(SUM(${receipts.total}), 0)`,
      receiptCount: sql<number>`COUNT(*)`,
    })
    .from(receipts)
    .where(
      sql`${receipts.date} >= ${startSeconds} AND ${receipts.date} < ${endSeconds}`
    );

  const itemResult = await db
    .select({
      itemCount: sql<number>`COUNT(*)`,
    })
    .from(receiptItems)
    .innerJoin(receipts, sql`${receiptItems.receiptId} = ${receipts.id}`)
    .where(
      sql`${receipts.date} >= ${startSeconds} AND ${receipts.date} < ${endSeconds}`
    );

  const totalSpent = Number(result[0]?.totalSpent) || 0;
  const receiptCount = Number(result[0]?.receiptCount) || 0;
  const itemCount = Number(itemResult[0]?.itemCount) || 0;

  return {
    totalSpent,
    receiptCount,
    itemCount,
    avgPerReceipt: receiptCount > 0 ? totalSpent / receiptCount : 0,
  };
}

export async function getByProductType(
  start: Date,
  end: Date
): Promise<ProductTypeBreakdown[]> {
  const startSeconds = Math.floor(start.getTime() / 1000);
  const endSeconds = Math.floor(end.getTime() / 1000);

  const result = await db
    .select({
      productType: receiptItems.productType,
      totalSpent: sql<number>`SUM(${receiptItems.totalPrice})`,
      itemCount: sql<number>`COUNT(*)`,
    })
    .from(receiptItems)
    .innerJoin(receipts, sql`${receiptItems.receiptId} = ${receipts.id}`)
    .where(
      sql`${receipts.date} >= ${startSeconds} AND ${receipts.date} < ${endSeconds}`
    )
    .groupBy(receiptItems.productType)
    .orderBy(desc(sql`SUM(${receiptItems.totalPrice})`));

  // Calculate total for percentages
  const total = result.reduce((sum, row) => sum + Number(row.totalSpent), 0);

  return result.map((row) => ({
    productType: row.productType || "Other",
    totalSpent: Number(row.totalSpent) || 0,
    itemCount: Number(row.itemCount) || 0,
    percentage: total > 0 ? (Number(row.totalSpent) / total) * 100 : 0,
  }));
}

export async function getByStore(
  start: Date,
  end: Date
): Promise<StoreBreakdown[]> {
  const startSeconds = Math.floor(start.getTime() / 1000);
  const endSeconds = Math.floor(end.getTime() / 1000);

  const result = await db
    .select({
      storeName: receipts.storeName,
      totalSpent: sql<number>`SUM(${receipts.total})`,
      receiptCount: sql<number>`COUNT(*)`,
    })
    .from(receipts)
    .where(
      sql`${receipts.date} >= ${startSeconds} AND ${receipts.date} < ${endSeconds}`
    )
    .groupBy(receipts.storeName)
    .orderBy(desc(sql`SUM(${receipts.total})`));

  return result.map((row) => ({
    storeName: row.storeName || "Unknown Store",
    totalSpent: Number(row.totalSpent) || 0,
    receiptCount: Number(row.receiptCount) || 0,
  }));
}

export async function getByDay(start: Date, end: Date): Promise<DayBreakdown[]> {
  const startSeconds = Math.floor(start.getTime() / 1000);
  const endSeconds = Math.floor(end.getTime() / 1000);

  const result = await db
    .select({
      // Date is already in seconds, so use 'unixepoch' directly
      date: sql<string>`date(${receipts.date}, 'unixepoch')`,
      totalSpent: sql<number>`SUM(${receipts.total})`,
    })
    .from(receipts)
    .where(
      sql`${receipts.date} >= ${startSeconds} AND ${receipts.date} < ${endSeconds}`
    )
    .groupBy(sql`date(${receipts.date}, 'unixepoch')`)
    .orderBy(sql`date(${receipts.date}, 'unixepoch')`);

  return result.map((row) => ({
    date: row.date,
    totalSpent: Number(row.totalSpent) || 0,
  }));
}

export async function getReportsData(period: Period, offset: number = 0): Promise<ReportsData> {
  const dateRange = getDateRange(period, offset);

  const [summary, byProductType, byStore, byDay] = await Promise.all([
    getSummary(dateRange.start, dateRange.end),
    getByProductType(dateRange.start, dateRange.end),
    getByStore(dateRange.start, dateRange.end),
    getByDay(dateRange.start, dateRange.end),
  ]);

  return {
    period: {
      start: dateRange.start,
      end: dateRange.end,
      label: dateRange.label,
    },
    summary,
    byProductType,
    byStore,
    byDay,
  };
}
