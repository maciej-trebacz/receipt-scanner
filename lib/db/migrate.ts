import { createClient } from "@libsql/client";

const DB_PATH = process.env.DATABASE_PATH || "./data/receipts.db";

const client = createClient({
  url: `file:${DB_PATH}`,
});

console.log("Running migrations...");

// Enable foreign key constraints
await client.execute("PRAGMA foreign_keys = ON;");

await client.execute(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at INTEGER NOT NULL
  )
`);

await client.execute(`
  CREATE TABLE IF NOT EXISTS receipts (
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
  CREATE TABLE IF NOT EXISTS receipt_items (
    id TEXT PRIMARY KEY,
    receipt_id TEXT NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    inferred_name TEXT,
    quantity REAL DEFAULT 1,
    unit_price REAL,
    total_price REAL NOT NULL,
    discount REAL,
    sort_order INTEGER NOT NULL
  )
`);

// Migration: add inferred_name column if it doesn't exist
try {
  await client.execute("ALTER TABLE receipt_items ADD COLUMN inferred_name TEXT");
  console.log("Added inferred_name column to receipt_items");
} catch {
  // Column already exists
}

// Migration: add product_type column if it doesn't exist
try {
  await client.execute("ALTER TABLE receipt_items ADD COLUMN product_type TEXT");
  console.log("Added product_type column to receipt_items");
} catch {
  // Column already exists
}

// Migration: add bounding_box column if it doesn't exist
try {
  await client.execute("ALTER TABLE receipt_items ADD COLUMN bounding_box TEXT");
  console.log("Added bounding_box column to receipt_items");
} catch {
  // Column already exists
}

console.log("Migrations complete!");

// Verify tables exist
const result = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
console.log("Tables created:", result.rows.map((t: any) => t.name).join(", "));

client.close();
