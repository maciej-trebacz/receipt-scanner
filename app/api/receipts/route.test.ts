import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import * as schema from "@/lib/db/schema";

// Set up test database (in-memory)
const client = createClient({ url: ":memory:" });
const testDb = drizzle(client, { schema });

// Create tables
beforeAll(async () => {
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
      store_name TEXT,
      store_address TEXT,
      date INTEGER,
      currency TEXT DEFAULT 'PLN',
      subtotal REAL,
      tax REAL,
      total REAL NOT NULL,
      image_path TEXT NOT NULL,
      raw_text TEXT,
      category_id TEXT REFERENCES categories(id),
      notes TEXT,
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

  // Seed a test category
  await testDb.insert(schema.categories).values({
    id: "test-category-id",
    name: "Test Category",
    icon: "TestIcon",
    color: "#ff0000",
    createdAt: new Date(),
  });
});

afterAll(() => {
  client.close();
});

describe("receipts API logic", () => {
  beforeEach(async () => {
    // Clear receipts and items before each test
    await client.execute("DELETE FROM receipt_items");
    await client.execute("DELETE FROM receipts");
  });

  test("can create a receipt", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Test Store",
      total: 100.50,
      imagePath: "/uploads/test.jpg",
      categoryId: "test-category-id",
      createdAt: now,
      updatedAt: now,
    });

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId));

    expect(result).toHaveLength(1);
    expect(result[0].storeName).toBe("Test Store");
    expect(result[0].total).toBe(100.50);
  });

  test("can list receipts", async () => {
    const now = new Date();

    await testDb.insert(schema.receipts).values([
      {
        id: uuid(),
        storeName: "Store A",
        total: 50,
        imagePath: "/uploads/a.jpg",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuid(),
        storeName: "Store B",
        total: 75,
        imagePath: "/uploads/b.jpg",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const result = await testDb.select().from(schema.receipts);
    expect(result).toHaveLength(2);
  });

  test("can update a receipt", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Original Store",
      total: 100,
      imagePath: "/uploads/test.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb
      .update(schema.receipts)
      .set({ storeName: "Updated Store", total: 200 })
      .where(eq(schema.receipts.id, receiptId));

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId));

    expect(result[0].storeName).toBe("Updated Store");
    expect(result[0].total).toBe(200);
  });

  test("can delete a receipt", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "To Delete",
      total: 50,
      imagePath: "/uploads/delete.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.delete(schema.receipts).where(eq(schema.receipts.id, receiptId));

    const result = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.id, receiptId));

    expect(result).toHaveLength(0);
  });

  test("can create receipt with items", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Item Store",
      total: 25,
      imagePath: "/uploads/items.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(schema.receiptItems).values([
      {
        id: uuid(),
        receiptId,
        name: "Item 1",
        quantity: 2,
        unitPrice: 5,
        totalPrice: 10,
        sortOrder: 0,
      },
      {
        id: uuid(),
        receiptId,
        name: "Item 2",
        totalPrice: 15,
        sortOrder: 1,
      },
    ]);

    const items = await testDb
      .select()
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.receiptId, receiptId));

    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("Item 1");
    expect(items[1].name).toBe("Item 2");
  });

  test("cascade deletes items when receipt is deleted", async () => {
    const receiptId = uuid();
    const now = new Date();

    await testDb.insert(schema.receipts).values({
      id: receiptId,
      storeName: "Cascade Store",
      total: 100,
      imagePath: "/uploads/cascade.jpg",
      createdAt: now,
      updatedAt: now,
    });

    await testDb.insert(schema.receiptItems).values({
      id: uuid(),
      receiptId,
      name: "Cascade Item",
      totalPrice: 100,
      sortOrder: 0,
    });

    // Delete receipt
    await testDb.delete(schema.receipts).where(eq(schema.receipts.id, receiptId));

    // Items should be gone
    const items = await testDb
      .select()
      .from(schema.receiptItems)
      .where(eq(schema.receiptItems.receiptId, receiptId));

    expect(items).toHaveLength(0);
  });

  test("can filter receipts by category", async () => {
    const now = new Date();

    await testDb.insert(schema.receipts).values([
      {
        id: uuid(),
        storeName: "With Category",
        total: 50,
        imagePath: "/uploads/cat1.jpg",
        categoryId: "test-category-id",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuid(),
        storeName: "Without Category",
        total: 75,
        imagePath: "/uploads/cat2.jpg",
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const filtered = await testDb
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.categoryId, "test-category-id"));

    expect(filtered).toHaveLength(1);
    expect(filtered[0].storeName).toBe("With Category");
  });
});
