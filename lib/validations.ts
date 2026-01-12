/**
 * Input validation schemas using Zod.
 * All user inputs must pass validation before processing.
 */

import { z } from "zod";

// Supported currencies
export const SUPPORTED_CURRENCIES = ["PLN", "USD", "EUR"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

// Receipt validation schema
export const receiptSchema = z.object({
  storeName: z.string().min(1).max(200),
  storeAddress: z.string().max(500).optional().nullable(),
  date: z.coerce
    .date()
    .max(new Date(), "Date cannot be in the future")
    .optional()
    .nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES).default("PLN"),
  subtotal: z.number().nonnegative().max(10000000).optional().nullable(),
  tax: z.number().nonnegative().max(10000000).optional().nullable(),
  total: z.number().positive().max(10000000),
  notes: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
});

// Receipt item validation schema
export const receiptItemSchema = z.object({
  name: z.string().min(1).max(200),
  inferredName: z.string().max(200).optional().nullable(),
  productType: z.string().max(100).optional().nullable(),
  boundingBox: z.array(z.number()).length(4).optional().nullable(),
  quantity: z.number().positive().max(10000).default(1),
  unitPrice: z.number().nonnegative().max(10000000).optional().nullable(),
  totalPrice: z.number().nonnegative().max(10000000),
  discount: z.number().nonnegative().max(10000000).optional().nullable(),
});

// Full receipt with items schema
export const receiptWithItemsSchema = receiptSchema.extend({
  items: z.array(receiptItemSchema).max(500).optional(),
});

// Update receipt schema (all fields optional)
export const updateReceiptSchema = z.object({
  storeName: z.string().min(1).max(200).optional().nullable(),
  storeAddress: z.string().max(500).optional().nullable(),
  date: z.coerce
    .date()
    .max(new Date(), "Date cannot be in the future")
    .optional()
    .nullable(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  subtotal: z.number().nonnegative().max(10000000).optional().nullable(),
  tax: z.number().nonnegative().max(10000000).optional().nullable(),
  total: z.number().positive().max(10000000).optional(),
  notes: z.string().max(2000).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  items: z.array(receiptItemSchema).max(500).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Report params schema
export const reportParamsSchema = z.object({
  period: z.enum(["week", "month", "year", "all"]).default("month"),
  offset: z.coerce.number().int().min(-100).max(100).default(0),
});

// File upload validation
// Vercel serverless functions have a 4.5MB body limit
export const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return {
      valid: false,
      error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC",
    };
  }
  return { valid: true };
}

// Type exports for use in API routes
export type ReceiptInput = z.infer<typeof receiptSchema>;
export type ReceiptItemInput = z.infer<typeof receiptItemSchema>;
export type ReceiptWithItemsInput = z.infer<typeof receiptWithItemsSchema>;
export type UpdateReceiptInput = z.infer<typeof updateReceiptSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ReportParamsInput = z.infer<typeof reportParamsSchema>;
