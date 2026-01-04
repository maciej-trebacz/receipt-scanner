import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Categories table
export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"), // hugeicons icon name
  color: text("color"), // hex color for UI
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Receipts table
export const receipts = sqliteTable("receipts", {
  id: text("id").primaryKey(),
  storeName: text("store_name"),
  storeAddress: text("store_address"),
  date: integer("date", { mode: "timestamp" }), // purchase date
  currency: text("currency").default("PLN"),
  subtotal: real("subtotal"),
  tax: real("tax"),
  total: real("total").notNull(),
  imagePath: text("image_path").notNull(),
  receiptBoundingBox: text("receipt_bounding_box"), // JSON: [ymin, xmin, ymax, xmax] in 0-1000 scale
  rawText: text("raw_text"), // OCR raw output for debugging
  categoryId: text("category_id").references(() => categories.id),
  notes: text("notes"),
  // Processing status for async workflow
  status: text("status").default("completed").notNull(), // pending|processing|completed|failed
  errorMessage: text("error_message"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Receipt items (line items)
export const receiptItems = sqliteTable("receipt_items", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // raw name from receipt
  inferredName: text("inferred_name"), // AI-inferred readable name
  productType: text("product_type"), // AI-inferred product category (e.g., "bread", "milk", "vegetables")
  boundingBox: text("bounding_box"), // JSON: [ymin, xmin, ymax, xmax] in 0-1000 scale
  quantity: real("quantity").default(1),
  unitPrice: real("unit_price"),
  totalPrice: real("total_price").notNull(),
  discount: real("discount"),
  sortOrder: integer("sort_order").notNull(),
});

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type NewReceiptItem = typeof receiptItems.$inferInsert;
