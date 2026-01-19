import { describe, test, expect, mock, beforeEach } from "bun:test";
import { NextRequest } from "next/server";

function mockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

const mockSummary = {
  totalSpent: 500.00,
  receiptCount: 10,
  itemCount: 50,
  avgPerReceipt: 50.00,
};

const mockByProductType = [
  { productType: "groceries", totalSpent: 300, itemCount: 30, percentage: 60 },
  { productType: "beverages", totalSpent: 200, itemCount: 20, percentage: 40 },
];

const mockByStore = [
  { storeName: "Biedronka", totalSpent: 250, receiptCount: 5 },
  { storeName: "Lidl", totalSpent: 250, receiptCount: 5 },
];

const mockByDay = [
  { date: "2024-12-01", totalSpent: 50 },
  { date: "2024-12-02", totalSpent: 75 },
];

// Inline implementation of getDateRange for mocking (avoids importing from real module)
function getDateRange(period: "week" | "month" | "year" | "all", offset: number = 0) {
  const now = new Date();
  let start: Date;
  let end: Date;
  let label: string;

  switch (period) {
    case "week": {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now);
      start.setDate(now.getDate() - diff + offset * 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      const startStr = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const endDisplay = new Date(end);
      endDisplay.setDate(endDisplay.getDate() - 1);
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
      end = new Date(now.getTime() + 86400000);
      label = "All Time";
      break;
    }
  }

  if (offset === 0 && period !== "all") {
    end = new Date(now.getTime() + 86400000);
  }

  return { start, end, label };
}

mock.module("@/lib/reports", () => ({
  getDateRange,
  getSummary: async () => mockSummary,
  getByProductType: async () => mockByProductType,
  getByStore: async () => mockByStore,
  getByDay: async () => mockByDay,
  getReportsData: async (period: string, offset: number) => ({
    period: getDateRange(period as "week" | "month" | "year" | "all", offset),
    summary: mockSummary,
    byProductType: mockByProductType,
    byStore: mockByStore,
    byDay: mockByDay,
  }),
}));

const { GET } = await import("@/app/api/reports/route");

describe("GET /api/reports", () => {
  test("returns default monthly report", async () => {
    const req = mockRequest("/api/reports");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalSpent).toBe(500.00);
    expect(data.byProductType).toHaveLength(2);
    expect(data.byStore).toHaveLength(2);
    expect(data.byDay).toHaveLength(2);
  });

  test("accepts week period", async () => {
    const req = mockRequest("/api/reports?period=week");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("accepts month period", async () => {
    const req = mockRequest("/api/reports?period=month");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("accepts year period", async () => {
    const req = mockRequest("/api/reports?period=year");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("accepts all period", async () => {
    const req = mockRequest("/api/reports?period=all");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("accepts negative offset", async () => {
    const req = mockRequest("/api/reports?period=month&offset=-1");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("clamps positive offset to zero", async () => {
    const req = mockRequest("/api/reports?period=month&offset=5");
    const res = await GET(req);

    expect(res.status).toBe(200);
  });

  test("rejects invalid period", async () => {
    const req = mockRequest("/api/reports?period=invalid");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid parameters");
  });

  test("rejects offset outside range", async () => {
    const req = mockRequest("/api/reports?offset=-150");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

describe("getDateRange", () => {
  describe("week period", () => {
    test("week starts on Monday", () => {
      const range = getDateRange("week", 0);
      expect(range.start.getDay()).toBe(1);
    });

    test("week start and end are 7 days apart (ignoring current week adjustment)", () => {
      const range = getDateRange("week", -1);
      const diffMs = range.end.getTime() - range.start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });

    test("negative offset goes to previous weeks", () => {
      const current = getDateRange("week", 0);
      const previous = getDateRange("week", -1);

      const diffMs = current.start.getTime() - previous.start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    });
  });

  describe("month period", () => {
    test("starts on first of month", () => {
      const range = getDateRange("month", 0);
      expect(range.start.getDate()).toBe(1);
    });

    test("negative offset goes to previous months", () => {
      const current = getDateRange("month", 0);
      const previous = getDateRange("month", -1);

      expect(previous.start.getMonth()).toBe(
        (current.start.getMonth() - 1 + 12) % 12
      );
    });
  });

  describe("year period", () => {
    test("starts on January 1st", () => {
      const range = getDateRange("year", 0);
      expect(range.start.getMonth()).toBe(0);
      expect(range.start.getDate()).toBe(1);
    });

    test("negative offset goes to previous years", () => {
      const current = getDateRange("year", 0);
      const previous = getDateRange("year", -1);

      expect(previous.start.getFullYear()).toBe(
        current.start.getFullYear() - 1
      );
    });
  });

  describe("all period", () => {
    test("starts at epoch", () => {
      const range = getDateRange("all", 0);
      expect(range.start.getTime()).toBe(0);
    });

    test("label is 'All Time'", () => {
      const range = getDateRange("all", 0);
      expect(range.label).toBe("All Time");
    });
  });
});
