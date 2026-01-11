import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  integer,
  uuid,
} from "drizzle-orm/pg-core";

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"), // hugeicons icon name
  color: text("color"), // hex color for UI
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

// Receipts table
export const receipts = pgTable("receipts", {
  id: uuid("id").primaryKey(),
  storeName: text("store_name"),
  storeAddress: text("store_address"),
  date: timestamp("date", { withTimezone: true }), // purchase date
  currency: text("currency").default("PLN"),
  subtotal: doublePrecision("subtotal"),
  tax: doublePrecision("tax"),
  total: doublePrecision("total").notNull(),
  imagePath: text("image_path").notNull(),
  receiptBoundingBox: text("receipt_bounding_box"), // JSON: [ymin, xmin, ymax, xmax] in 0-1000 scale
  rawText: text("raw_text"), // OCR raw output for debugging
  categoryId: uuid("category_id").references(() => categories.id),
  notes: text("notes"),
  // Processing status for async workflow
  status: text("status").default("completed").notNull(), // pending|processing|completed|failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

// Receipt items (line items)
export const receiptItems = pgTable("receipt_items", {
  id: uuid("id").primaryKey(),
  receiptId: uuid("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // raw name from receipt
  inferredName: text("inferred_name"), // AI-inferred readable name
  productType: text("product_type"), // AI-inferred product category (e.g., "bread", "milk", "vegetables")
  boundingBox: text("bounding_box"), // JSON: [ymin, xmin, ymax, xmax] in 0-1000 scale
  quantity: doublePrecision("quantity").default(1),
  unitPrice: doublePrecision("unit_price"),
  totalPrice: doublePrecision("total_price").notNull(),
  discount: doublePrecision("discount"),
  sortOrder: integer("sort_order").notNull(),
});

// Type exports
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;
export type ReceiptItem = typeof receiptItems.$inferSelect;
export type NewReceiptItem = typeof receiptItems.$inferInsert;
