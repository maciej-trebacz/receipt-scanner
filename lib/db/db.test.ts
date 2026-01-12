import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as schema from "./schema";

// Use in-memory database for tests
const client = createClient({ url: ":memory:" });
const testDb = drizzle(client, { schema });

// Create tables
beforeAll(async () => {
  // Enable foreign key constraints
  await client.execute("PRAGMA foreign_keys = ON;");

  await client.execute(`
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      store_name TEXT,
      store_address TEXT,
      date INTEGER,
      currency TEXT DEFAULT 'PLN',
      subtotal REAL,
      tax REAL,
      total REAL NOT NULL,
      image_path TEXT NOT NULL,
      receipt_bounding_box TEXT,
      raw_text TEXT,
      category_id TEXT REFERENCES categories(id),
      notes TEXT,
      status TEXT DEFAULT 'completed' NOT NULL,
      error_message TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE receipt_items (
      id TEXT PRIMARY KEY,
      receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      inferred_name TEXT,
      product_type TEXT,
      bounding_box TEXT,
      quantity REAL DEFAULT 1,
      unit_price REAL,
      total_price REAL NOT NULL,
      discount REAL,
      sort_order INTEGER NOT NULL
    )
  `);
});

afterAll(() => {
  client.close();
});

describe("categories", () => {
  test("creates a category", async () => {
    const id = uuid();
    const now = new Date();

    await testDb.insert(schema.categories).values({
      id,
      name: "Test Category",
      icon: "TestIcon",
      color: "#ff0000",
      createdAt: now,
    });

    const result = await testDb
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, id));

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Category");
    expect(result[0].color).toBe("#ff0000");
  });

  test("lists all categories", async () => {
    const result = await testDb.select().from(schema.categories);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("receipts", () => {
  let categoryId: string;

  beforeAll(async () => {
    categoryId = uuid();
    await testDb.insert(schema.categories).values({
      id: categoryId,
      name: "Groceries",
      createdAt: new Date(),
    });
  });

  test("creates a receipt", async () => {
    const id = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id,
      storeName: "Biedronka",
      total: 45.99,
      imagePath: "/uploads/test.jpg",
      categoryId,
      createdAt: now,
      updatedAt: now,
    });

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, id));

    expect(result).toHaveLength(1);
    expect(result[0].storeName).toBe("Biedronka");
    expect(result[0].total).toBe(45.99);
    expect(result[0].currency).toBe("PLN");
  });

  test("creates receipt with items", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Lidl",
      total: 25.50,
      imagePath: "/uploads/lidl.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(schema.receiptItems).values([
      {
        id: uuid(),
        receiptId,
        name: "Milk",
        quantity: 2,
        unitPrice: 3.50,
        totalPrice: 7.00,
        sortOrder: 0,
      },
      {
        id: uuid(),
        receiptId,
        name: "Bread",
        quantity: 1,
        totalPrice: 4.50,
        sortOrder: 1,
      },
    ]);

    const items = await testDb
      .select()
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.receiptId, receiptId));

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Milk");
    expect(items[1].name).toBe("Bread");
  });

  test("updates a receipt", async () => {
    const id = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id,
      storeName: "Old Store",
      total: 10.00,
      imagePath: "/uploads/old.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb
      .update(schema.receipts)
      .set({ storeName: "New Store", updatedAt: new Date() })
      .where(eq(schema.receipts.id, id));

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, id));

    expect(result[0].storeName).toBe("New Store");
  });

  test("deletes a receipt", async () => {
    const id = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id,
      storeName: "To Delete",
      total: 5.00,
      imagePath: "/uploads/delete.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.delete(schema.receipts).where(eq(schema.receipts.id, id));

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, id));

    expect(result).toHaveLength(0);
  });
});

describe("receipt items", () => {
  test("cascade deletes items when receipt is deleted", async () => {
    const receiptId = uuid();
    const itemId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Cascade Test",
      total: 20.00,
      imagePath: "/uploads/cascade.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(schema.receiptItems).values({
      id: itemId,
      receiptId,
      name: "Test Item",
      totalPrice: 20.00,
      sortOrder: 0,
    });

    // Verify item exists
    let items = await testDb
      .select()
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.id, itemId));
    expect(items).toHaveLength(1);

    // Delete receipt
    await testDb.delete(schema.receipts).where(eq(schema.receipts.id, receiptId));

    // Item should be cascade deleted
    items = await testDb
      .select()
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.id, itemId));
    expect(items).toHaveLength(0);
  });
});
