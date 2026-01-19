import { describe, test, expect, beforeEach } from "bun:test";
import { NextRequest } from "next/server";
import {
  createTestReceipt,
  createTestReceiptItem,
  createGroceryReceipt,
  createGroceryItems,
} from "../fixtures/receipts";

const TEST_RECEIPT_ID = "test-receipt-id-123";
const TEST_USER_ID = "test-user-123";
const TEST_CATEGORY_ID = "550e8400-e29b-41d4-a716-446655440000";

let mockReceipts: Map<string, ReturnType<typeof createTestReceipt>>;
let mockItems: Map<string, ReturnType<typeof createTestReceiptItem>[]>;

function resetMocks() {
  mockReceipts = new Map();
  mockItems = new Map();

  // Configure global mock handlers for this test file
  globalThis.mockQueryHandlers = {
    getReceiptById: async (id: string) => {
      const receipt = mockReceipts.get(id);
      if (!receipt) return null;
      return {
        ...receipt,
        items: mockItems.get(id) || [],
      };
    },
    receiptExists: async (id: string) => mockReceipts.has(id),
    updateReceipt: async (
      id: string,
      data: Partial<ReturnType<typeof createTestReceipt>>
    ) => {
      const existing = mockReceipts.get(id);
      if (!existing) throw new Error("Receipt not found");
      const updated = { ...existing, ...data, updatedAt: new Date() };
      mockReceipts.set(id, updated);
      return { ...updated, items: mockItems.get(id) || [] };
    },
    deleteReceipt: async (id: string) => {
      mockReceipts.delete(id);
      mockItems.delete(id);
      return { success: true };
    },
    listReceipts: async (params: {
      userId: string;
      categoryId?: string;
      cursor?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    }) => {
      let receipts = Array.from(mockReceipts.values()).filter(
        (r) => r.userId === params.userId
      );
      if (params.categoryId) {
        receipts = receipts.filter((r) => r.categoryId === params.categoryId);
      }
      const limit = params.limit || 20;
      const hasMore = receipts.length > limit;
      return {
        receipts: receipts.slice(0, limit),
        nextCursor: hasMore ? receipts[limit - 1].id : null,
        hasMore,
      };
    },
    createReceipt: async (
      data: ReturnType<typeof createTestReceipt> & { items?: unknown[] }
    ) => {
      const { items, ...receiptData } = data;
      mockReceipts.set(data.id, receiptData as ReturnType<typeof createTestReceipt>);
      if (items) {
        mockItems.set(
          data.id,
          items.map((item, i) =>
            createTestReceiptItem(data.id, { ...(item as object), sortOrder: i })
          )
        );
      }
      return { ...receiptData, items: mockItems.get(data.id) || [] };
    },
  };
}

function mockRequest(
  method: string,
  url: string,
  body?: unknown
): NextRequest {
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

// Import routes (mocks are configured in setup.ts)
const { GET, PUT, DELETE } = await import("@/app/api/receipts/[id]/route");
const { GET: ListReceipts, POST: CreateReceipt } = await import(
  "@/app/api/receipts/route"
);

describe("GET /api/receipts/[id]", () => {
  beforeEach(() => {
    resetMocks();
    const receipt = createTestReceipt({ id: TEST_RECEIPT_ID });
    mockReceipts.set(TEST_RECEIPT_ID, receipt);
    mockItems.set(TEST_RECEIPT_ID, createGroceryItems(TEST_RECEIPT_ID));
  });

  test("returns receipt with items", async () => {
    const req = mockRequest("GET", `/api/receipts/${TEST_RECEIPT_ID}`);
    const res = await GET(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(TEST_RECEIPT_ID);
    expect(data.storeName).toBe("Test Store");
    expect(data.items).toHaveLength(3);
  });

  test("returns 404 for non-existent receipt", async () => {
    const req = mockRequest("GET", "/api/receipts/non-existent-id");
    const res = await GET(req, { params: Promise.resolve({ id: "non-existent-id" }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Receipt not found");
  });
});

describe("PUT /api/receipts/[id]", () => {
  beforeEach(() => {
    resetMocks();
    const receipt = createTestReceipt({ id: TEST_RECEIPT_ID });
    mockReceipts.set(TEST_RECEIPT_ID, receipt);
  });

  test("updates receipt fields", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      storeName: "Updated Store",
      total: 200.00,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.storeName).toBe("Updated Store");
    expect(data.total).toBe(200.00);
  });

  test("handles empty string categoryId (converts to null)", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      categoryId: "",
      total: 10.00,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const updated = mockReceipts.get(TEST_RECEIPT_ID);
    expect(updated?.categoryId).toBeNull();
  });

  test("handles null categoryId", async () => {
    // First set a categoryId
    mockReceipts.set(
      TEST_RECEIPT_ID,
      createTestReceipt({ id: TEST_RECEIPT_ID, categoryId: TEST_CATEGORY_ID })
    );

    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      categoryId: null,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const updated = mockReceipts.get(TEST_RECEIPT_ID);
    expect(updated?.categoryId).toBeNull();
  });

  test("accepts valid UUID categoryId", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      categoryId: TEST_CATEGORY_ID,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const updated = mockReceipts.get(TEST_RECEIPT_ID);
    expect(updated?.categoryId).toBe(TEST_CATEGORY_ID);
  });

  test("returns 400 for invalid UUID categoryId", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      categoryId: "not-a-valid-uuid",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Validation failed");
  });

  test("returns 404 for non-existent receipt", async () => {
    const req = mockRequest("PUT", "/api/receipts/non-existent-id", {
      storeName: "New Store",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: "non-existent-id" }) });

    expect(res.status).toBe(404);
  });

  test("accepts partial updates", async () => {
    const originalReceipt = mockReceipts.get(TEST_RECEIPT_ID);
    const originalTotal = originalReceipt?.total;

    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      notes: "New notes",
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const updated = mockReceipts.get(TEST_RECEIPT_ID);
    expect(updated?.notes).toBe("New notes");
    expect(updated?.total).toBe(originalTotal);
  });

  test("updates items when provided", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      items: [
        { name: "New Item 1", totalPrice: 15.00 },
        { name: "New Item 2", totalPrice: 25.00 },
      ],
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
  });

  test("rejects negative total", async () => {
    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      total: -10,
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(400);
  });

  test("rejects future date", async () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const req = mockRequest("PUT", `/api/receipts/${TEST_RECEIPT_ID}`, {
      date: futureDate.toISOString(),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/receipts/[id]", () => {
  beforeEach(() => {
    resetMocks();
    const receipt = createTestReceipt({ id: TEST_RECEIPT_ID });
    mockReceipts.set(TEST_RECEIPT_ID, receipt);
    mockItems.set(TEST_RECEIPT_ID, createGroceryItems(TEST_RECEIPT_ID));
  });

  test("deletes receipt successfully", async () => {
    const req = mockRequest("DELETE", `/api/receipts/${TEST_RECEIPT_ID}`);
    const res = await DELETE(req, { params: Promise.resolve({ id: TEST_RECEIPT_ID }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);

    expect(mockReceipts.has(TEST_RECEIPT_ID)).toBe(false);
    expect(mockItems.has(TEST_RECEIPT_ID)).toBe(false);
  });

  test("returns 404 for non-existent receipt", async () => {
    const req = mockRequest("DELETE", "/api/receipts/non-existent-id");
    const res = await DELETE(req, {
      params: Promise.resolve({ id: "non-existent-id" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/receipts (list)", () => {
  beforeEach(() => {
    resetMocks();
    for (let i = 0; i < 5; i++) {
      const receipt = createGroceryReceipt({
        id: `receipt-${i}`,
        userId: TEST_USER_ID,
        categoryId: i % 2 === 0 ? TEST_CATEGORY_ID : null,
      });
      mockReceipts.set(receipt.id, receipt);
    }
  });

  test("returns paginated receipts", async () => {
    const req = mockRequest("GET", "/api/receipts?limit=3");
    const res = await ListReceipts(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.receipts).toHaveLength(3);
    expect(data.hasMore).toBe(true);
  });

  test("filters by categoryId", async () => {
    const req = mockRequest("GET", `/api/receipts?categoryId=${TEST_CATEGORY_ID}`);
    const res = await ListReceipts(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.receipts.length).toBeGreaterThan(0);
    for (const receipt of data.receipts) {
      expect(receipt.categoryId).toBe(TEST_CATEGORY_ID);
    }
  });

  test("rejects invalid limit", async () => {
    const req = mockRequest("GET", "/api/receipts?limit=100");
    const res = await ListReceipts(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid parameters");
  });
});

describe("POST /api/receipts (create)", () => {
  beforeEach(() => {
    resetMocks();
  });

  test("creates receipt with valid data", async () => {
    const newReceipt = {
      storeName: "New Store",
      total: 100.50,
      imagePath: "/uploads/test.jpg",
    };

    const req = mockRequest("POST", "/api/receipts", newReceipt);
    const res = await CreateReceipt(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.storeName).toBe("New Store");
    expect(data.total).toBe(100.50);
    expect(data.status).toBe("completed");
  });

  test("creates receipt with items", async () => {
    const newReceipt = {
      storeName: "Store with Items",
      total: 50.00,
      imagePath: "/uploads/items.jpg",
      items: [
        { name: "Item 1", totalPrice: 25.00 },
        { name: "Item 2", totalPrice: 25.00 },
      ],
    };

    const req = mockRequest("POST", "/api/receipts", newReceipt);
    const res = await CreateReceipt(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.items).toHaveLength(2);
  });

  test("rejects missing imagePath", async () => {
    const req = mockRequest("POST", "/api/receipts", {
      storeName: "Store",
      total: 100,
    });
    const res = await CreateReceipt(req);

    expect(res.status).toBe(400);
  });

  test("rejects missing storeName", async () => {
    const req = mockRequest("POST", "/api/receipts", {
      total: 100,
      imagePath: "/uploads/test.jpg",
    });
    const res = await CreateReceipt(req);

    expect(res.status).toBe(400);
  });

  test("rejects invalid total", async () => {
    const req = mockRequest("POST", "/api/receipts", {
      storeName: "Store",
      total: -10,
      imagePath: "/uploads/test.jpg",
    });
    const res = await CreateReceipt(req);

    expect(res.status).toBe(400);
  });

  test("handles categoryId correctly", async () => {
    const req = mockRequest("POST", "/api/receipts", {
      storeName: "Store",
      total: 100,
      imagePath: "/uploads/test.jpg",
      categoryId: TEST_CATEGORY_ID,
    });
    const res = await CreateReceipt(req);

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.categoryId).toBe(TEST_CATEGORY_ID);
  });
});
