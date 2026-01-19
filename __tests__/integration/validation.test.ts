import { describe, test, expect } from "bun:test";
import {
  updateReceiptSchema,
  receiptSchema,
  receiptItemSchema,
  paginationSchema,
  reportParamsSchema,
  validateFile,
  MAX_FILE_SIZE,
} from "@/lib/validations";

describe("updateReceiptSchema", () => {
  describe("categoryId handling", () => {
    test.each([
      { input: "", expected: null, desc: "empty string" },
      { input: null, expected: null, desc: "null" },
      { input: undefined, expected: null, desc: "undefined" },
    ])("transforms $desc categoryId to null", ({ input, expected }) => {
      const data = input === undefined ? {} : { categoryId: input };
      const result = updateReceiptSchema.parse(data);
      expect(result.categoryId).toBe(expected);
    });

    test("accepts valid UUID categoryId", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const result = updateReceiptSchema.parse({ categoryId: validUUID });
      expect(result.categoryId).toBe(validUUID);
    });

    test("rejects invalid UUID categoryId", () => {
      expect(() =>
        updateReceiptSchema.parse({ categoryId: "not-a-uuid" })
      ).toThrow();
    });
  });

  describe("partial updates", () => {
    test("accepts empty object (categoryId defaults to null)", () => {
      const result = updateReceiptSchema.parse({});
      expect(result.categoryId).toBeNull();
    });

    test("accepts single field update", () => {
      const result = updateReceiptSchema.parse({ storeName: "New Store" });
      expect(result.storeName).toBe("New Store");
      expect(result.total).toBeUndefined();
    });

    test("accepts multiple fields", () => {
      const result = updateReceiptSchema.parse({
        storeName: "New Store",
        total: 100.50,
        currency: "EUR",
      });
      expect(result.storeName).toBe("New Store");
      expect(result.total).toBe(100.50);
      expect(result.currency).toBe("EUR");
    });
  });

  describe("nullable fields", () => {
    test("allows null for optional fields", () => {
      const result = updateReceiptSchema.parse({
        storeName: null,
        storeAddress: null,
        date: null,
        subtotal: null,
        tax: null,
        notes: null,
      });
      expect(result.storeName).toBeNull();
      expect(result.storeAddress).toBeNull();
      expect(result.date).toBeNull();
    });
  });

  describe("date validation", () => {
    test("accepts valid date string", () => {
      const result = updateReceiptSchema.parse({ date: "2024-12-28" });
      expect(result.date).toBeInstanceOf(Date);
    });

    test("accepts Date object", () => {
      const date = new Date("2024-12-28");
      const result = updateReceiptSchema.parse({ date });
      expect(result.date).toBeInstanceOf(Date);
    });

    test("rejects future date", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(() =>
        updateReceiptSchema.parse({ date: futureDate })
      ).toThrow();
    });
  });

  describe("amount validation", () => {
    test("accepts positive total", () => {
      const result = updateReceiptSchema.parse({ total: 100.50 });
      expect(result.total).toBe(100.50);
    });

    test("rejects negative total", () => {
      expect(() => updateReceiptSchema.parse({ total: -10 })).toThrow();
    });

    test("rejects zero total (must be positive)", () => {
      expect(() => updateReceiptSchema.parse({ total: 0 })).toThrow();
    });

    test("accepts very large amount (up to 10 million)", () => {
      const result = updateReceiptSchema.parse({ total: 9999999 });
      expect(result.total).toBe(9999999);
    });

    test("rejects amount over 10 million", () => {
      expect(() => updateReceiptSchema.parse({ total: 10000001 })).toThrow();
    });
  });

  describe("currency validation", () => {
    test.each(["PLN", "USD", "EUR"])("accepts %s currency", (currency) => {
      const result = updateReceiptSchema.parse({ currency });
      expect(result.currency).toBe(currency);
    });

    test("rejects unsupported currency", () => {
      expect(() => updateReceiptSchema.parse({ currency: "GBP" })).toThrow();
    });
  });

  describe("items array", () => {
    test("accepts valid items array", () => {
      const result = updateReceiptSchema.parse({
        items: [
          { name: "Item 1", totalPrice: 10.00 },
          { name: "Item 2", quantity: 2, unitPrice: 5.00, totalPrice: 10.00 },
        ],
      });
      expect(result.items).toHaveLength(2);
    });

    test("rejects items with missing name", () => {
      expect(() =>
        updateReceiptSchema.parse({
          items: [{ totalPrice: 10.00 }],
        })
      ).toThrow();
    });

    test("rejects more than 500 items", () => {
      const tooManyItems = Array(501)
        .fill(null)
        .map((_, i) => ({ name: `Item ${i}`, totalPrice: 1.00 }));
      expect(() =>
        updateReceiptSchema.parse({ items: tooManyItems })
      ).toThrow();
    });
  });
});

describe("receiptSchema", () => {
  const validReceipt = {
    storeName: "Test Store",
    total: 100.50,
  };

  test("accepts minimal valid receipt", () => {
    const result = receiptSchema.parse(validReceipt);
    expect(result.storeName).toBe("Test Store");
    expect(result.total).toBe(100.50);
    expect(result.currency).toBe("PLN");
  });

  test("requires storeName", () => {
    expect(() => receiptSchema.parse({ total: 100 })).toThrow();
  });

  test("requires positive total", () => {
    expect(() =>
      receiptSchema.parse({ storeName: "Test", total: 0 })
    ).toThrow();
  });

  test("rejects empty storeName", () => {
    expect(() =>
      receiptSchema.parse({ storeName: "", total: 100 })
    ).toThrow();
  });

  test("rejects storeName over 200 chars", () => {
    const longName = "a".repeat(201);
    expect(() =>
      receiptSchema.parse({ storeName: longName, total: 100 })
    ).toThrow();
  });
});

describe("receiptItemSchema", () => {
  test("accepts minimal valid item", () => {
    const result = receiptItemSchema.parse({
      name: "Test Item",
      totalPrice: 10.00,
    });
    expect(result.name).toBe("Test Item");
    expect(result.totalPrice).toBe(10.00);
    expect(result.quantity).toBe(1);
  });

  test("defaults quantity to 1", () => {
    const result = receiptItemSchema.parse({
      name: "Item",
      totalPrice: 5.00,
    });
    expect(result.quantity).toBe(1);
  });

  test("accepts full item with all fields", () => {
    const result = receiptItemSchema.parse({
      name: "PRINCE POLO 35G",
      inferredName: "Chocolate Bar",
      productType: "snacks",
      boundingBox: [100, 200, 300, 400],
      quantity: 2,
      unitPrice: 1.99,
      totalPrice: 3.98,
      discount: 0.50,
    });
    expect(result.inferredName).toBe("Chocolate Bar");
    expect(result.productType).toBe("snacks");
    expect(result.boundingBox).toEqual([100, 200, 300, 400]);
  });

  test("rejects negative totalPrice", () => {
    expect(() =>
      receiptItemSchema.parse({ name: "Item", totalPrice: -5 })
    ).toThrow();
  });

  test("rejects quantity over 10000", () => {
    expect(() =>
      receiptItemSchema.parse({ name: "Item", totalPrice: 5, quantity: 10001 })
    ).toThrow();
  });

  test("rejects boundingBox with wrong length", () => {
    expect(() =>
      receiptItemSchema.parse({
        name: "Item",
        totalPrice: 5,
        boundingBox: [1, 2, 3],
      })
    ).toThrow();
  });
});

describe("paginationSchema", () => {
  test("provides defaults for empty params", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(20);
    expect(result.cursor).toBeUndefined();
  });

  test("coerces string limit to number", () => {
    const result = paginationSchema.parse({ limit: "10" });
    expect(result.limit).toBe(10);
  });

  test("enforces min limit of 1", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  test("enforces max limit of 50", () => {
    expect(() => paginationSchema.parse({ limit: 51 })).toThrow();
  });

  test("accepts valid categoryId filter", () => {
    const validUUID = "123e4567-e89b-12d3-a456-426614174000";
    const result = paginationSchema.parse({ categoryId: validUUID });
    expect(result.categoryId).toBe(validUUID);
  });

  test("accepts date range", () => {
    const result = paginationSchema.parse({
      startDate: "2024-01-01",
      endDate: "2024-12-31",
    });
    expect(result.startDate).toBe("2024-01-01");
    expect(result.endDate).toBe("2024-12-31");
  });
});

describe("reportParamsSchema", () => {
  test("provides defaults", () => {
    const result = reportParamsSchema.parse({});
    expect(result.period).toBe("month");
    expect(result.offset).toBe(0);
  });

  test.each(["week", "month", "year", "all"] as const)(
    "accepts %s period",
    (period) => {
      const result = reportParamsSchema.parse({ period });
      expect(result.period).toBe(period);
    }
  );

  test("rejects invalid period", () => {
    expect(() => reportParamsSchema.parse({ period: "day" })).toThrow();
  });

  test("coerces string offset to number", () => {
    const result = reportParamsSchema.parse({ offset: "-1" });
    expect(result.offset).toBe(-1);
  });

  test("enforces min offset of -100", () => {
    expect(() => reportParamsSchema.parse({ offset: -101 })).toThrow();
  });

  test("enforces max offset of 100", () => {
    expect(() => reportParamsSchema.parse({ offset: 101 })).toThrow();
  });
});

describe("validateFile", () => {
  test("accepts valid JPEG file", () => {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test("accepts valid PNG file", () => {
    const file = new File(["test"], "test.png", { type: "image/png" });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test("accepts valid WebP file", () => {
    const file = new File(["test"], "test.webp", { type: "image/webp" });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test("accepts valid HEIC file", () => {
    const file = new File(["test"], "test.heic", { type: "image/heic" });
    expect(validateFile(file)).toEqual({ valid: true });
  });

  test("rejects unsupported file type", () => {
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid file type");
  });

  test("rejects file over 4MB", () => {
    const largeContent = new Uint8Array(MAX_FILE_SIZE + 1);
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    const result = validateFile(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("too large");
  });

  test("accepts file exactly at 4MB limit", () => {
    const content = new Uint8Array(MAX_FILE_SIZE);
    const file = new File([content], "max.jpg", { type: "image/jpeg" });
    expect(validateFile(file)).toEqual({ valid: true });
  });
});
