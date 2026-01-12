/**
 * Centralized query functions using Supabase client.
 * These functions provide a clean abstraction over the database layer.
 */

import { getServerSupabaseClient } from "./supabase";
import type { Category, Receipt, ReceiptItem, NewReceipt, NewReceiptItem, NewCategory, User, CreditTransaction } from "./schema";

// ============================================================================
// Types
// ============================================================================

export type ReceiptStatus = "pending" | "processing" | "completed" | "failed";
export type CreditTransactionType = "signup_bonus" | "purchase" | "usage" | "refund";

export interface ReceiptWithCategory extends Receipt {
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon?: string | null;
}

export interface ReceiptListItem {
  id: string;
  storeName: string | null;
  date: Date | null;
  total: number;
  currency: string | null;
  imagePath: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
}

export interface ReceiptListResult {
  receipts: ReceiptListItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ReceiptStatusInfo {
  id: string;
  status: string;
  errorMessage: string | null;
  storeName: string | null;
  total: number;
  imagePath: string;
}

// ============================================================================
// User Queries
// ============================================================================

export interface CreateUserData {
  id: string;
  email: string;
  name: string | null;
  credits?: number;
}

export async function createUser(data: CreateUserData): Promise<User> {
  const supabase = getServerSupabaseClient();
  const now = new Date().toISOString();
  const credits = data.credits ?? 5;

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      id: data.id,
      email: data.email,
      name: data.name,
      credits,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }

  await supabase.from("credit_transactions").insert({
    user_id: data.id,
    amount: credits,
    type: "signup_bonus",
    description: "Welcome bonus credits",
    created_at: now,
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    preferredCurrency: user.preferred_currency,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at),
  };
}

export async function getUser(id: string): Promise<User | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch user: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    name: data.name,
    credits: data.credits,
    preferredCurrency: data.preferred_currency,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function deleteUser(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}

export async function updateUserCredits(id: string, credits: number): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("users")
    .update({ credits, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update user credits: ${error.message}`);
  }
}

// ============================================================================
// Credit Transaction Queries
// ============================================================================

export interface CreateTransactionData {
  userId: string;
  amount: number;
  type: CreditTransactionType;
  description?: string;
  receiptId?: string;
  stripePaymentId?: string;
}

export async function createCreditTransaction(data: CreateTransactionData): Promise<CreditTransaction> {
  const supabase = getServerSupabaseClient();

  const { data: transaction, error } = await supabase
    .from("credit_transactions")
    .insert({
      user_id: data.userId,
      amount: data.amount,
      type: data.type,
      description: data.description || null,
      receipt_id: data.receiptId || null,
      stripe_payment_id: data.stripePaymentId || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create transaction: ${error.message}`);
  }

  return {
    id: transaction.id,
    userId: transaction.user_id,
    amount: transaction.amount,
    type: transaction.type,
    description: transaction.description,
    receiptId: transaction.receipt_id,
    stripePaymentId: transaction.stripe_payment_id,
    createdAt: new Date(transaction.created_at),
  };
}

export async function getUserTransactions(
  userId: string,
  options?: { limit?: number }
): Promise<CreditTransaction[]> {
  const supabase = getServerSupabaseClient();
  const limit = options?.limit ?? 50;

  const { data, error } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return (data || []).map((t) => ({
    id: t.id,
    userId: t.user_id,
    amount: t.amount,
    type: t.type,
    description: t.description,
    receiptId: t.receipt_id,
    stripePaymentId: t.stripe_payment_id,
    createdAt: new Date(t.created_at),
  }));
}

// ============================================================================
// Category Queries
// ============================================================================

/**
 * Get all categories
 */
export async function getAllCategories(): Promise<Category[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []).map(row => ({
    ...row,
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(id: string): Promise<Category | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  return data ? {
    ...data,
    createdAt: new Date(data.created_at),
  } : null;
}

/**
 * Create a new category
 */
export async function createCategory(category: NewCategory): Promise<Category> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("categories")
    .insert({
      id: category.id,
      name: category.name,
      icon: category.icon,
      color: category.color,
      created_at: category.createdAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return {
    ...data,
    createdAt: new Date(data.created_at),
  };
}

// ============================================================================
// Receipt Queries
// ============================================================================

export interface ListReceiptsOptions {
  userId?: string | null;
  categoryId?: string | null;
  cursor?: string | null; // ISO date string for pagination
  startDate?: string | null; // ISO date string
  endDate?: string | null; // ISO date string
  limit?: number;
}

/**
 * List receipts with pagination and filtering
 */
export async function listReceipts(options: ListReceiptsOptions = {}): Promise<ReceiptListResult> {
  const supabase = getServerSupabaseClient();
  const limit = options.limit || 20;

  // Build query
  let query = supabase
    .from("receipts")
    .select(`
      id,
      store_name,
      date,
      total,
      currency,
      image_path,
      category_id,
      status,
      error_message,
      created_at,
      categories (
        name,
        color
      )
    `)
    .order("status", { ascending: true }) // pending/processing first
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  // Apply filters
  if (options.userId) {
    query = query.eq("user_id", options.userId);
  }

  if (options.categoryId) {
    query = query.eq("category_id", options.categoryId);
  }

  if (options.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  if (options.startDate) {
    const start = new Date(options.startDate);
    start.setHours(0, 0, 0, 0);
    query = query.gte("date", start.toISOString());
  }

  if (options.endDate) {
    const end = new Date(options.endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lt("date", end.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch receipts: ${error.message}`);
  }

  const results = data || [];
  const hasMore = results.length > limit;
  const receiptsToReturn = hasMore ? results.slice(0, limit) : results;
  const lastReceipt = receiptsToReturn[receiptsToReturn.length - 1];

  return {
    receipts: receiptsToReturn.map(row => ({
      id: row.id,
      storeName: row.store_name,
      date: row.date ? new Date(row.date) : null,
      total: row.total,
      currency: row.currency,
      imagePath: row.image_path,
      categoryId: row.category_id,
      categoryName: (row.categories as any)?.name || null,
      categoryColor: (row.categories as any)?.color || null,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: new Date(row.created_at),
    })),
    nextCursor: hasMore && lastReceipt?.created_at
      ? lastReceipt.created_at
      : null,
    hasMore,
  };
}

/**
 * Get a single receipt by ID with category info
 */
export async function getReceiptById(id: string): Promise<(ReceiptWithCategory & { items: ReceiptItem[] }) | null> {
  const supabase = getServerSupabaseClient();

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select(`
      *,
      categories (
        name,
        color,
        icon
      )
    `)
    .eq("id", id)
    .single();

  if (receiptError) {
    if (receiptError.code === "PGRST116") return null; // Not found
    throw new Error(`Failed to fetch receipt: ${receiptError.message}`);
  }

  if (!receipt) return null;

  // Fetch items
  const { data: items, error: itemsError } = await supabase
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", id)
    .order("sort_order");

  if (itemsError) {
    throw new Error(`Failed to fetch receipt items: ${itemsError.message}`);
  }

  return {
    id: receipt.id,
    userId: receipt.user_id,
    storeName: receipt.store_name,
    storeAddress: receipt.store_address,
    date: receipt.date ? new Date(receipt.date) : null,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    total: receipt.total,
    imagePath: receipt.image_path,
    receiptBoundingBox: receipt.receipt_bounding_box,
    rawText: receipt.raw_text,
    categoryId: receipt.category_id,
    notes: receipt.notes,
    status: receipt.status,
    errorMessage: receipt.error_message,
    createdAt: new Date(receipt.created_at),
    updatedAt: new Date(receipt.updated_at),
    categoryName: (receipt.categories as any)?.name || null,
    categoryColor: (receipt.categories as any)?.color || null,
    categoryIcon: (receipt.categories as any)?.icon || null,
    items: (items || []).map(item => ({
      id: item.id,
      receiptId: item.receipt_id,
      name: item.name,
      inferredName: item.inferred_name,
      productType: item.product_type,
      boundingBox: item.bounding_box,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      discount: item.discount,
      sortOrder: item.sort_order,
    })),
  };
}

/**
 * Check if a receipt exists
 */
export async function receiptExists(id: string): Promise<boolean> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("id")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return false; // Not found
    throw new Error(`Failed to check receipt existence: ${error.message}`);
  }

  return !!data;
}

/**
 * Get receipt by ID (simple version, just the receipt row)
 */
export async function getReceiptSimple(id: string): Promise<Receipt | null> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch receipt: ${error.message}`);
  }

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    storeName: data.store_name,
    storeAddress: data.store_address,
    date: data.date ? new Date(data.date) : null,
    currency: data.currency,
    subtotal: data.subtotal,
    tax: data.tax,
    total: data.total,
    imagePath: data.image_path,
    receiptBoundingBox: data.receipt_bounding_box,
    rawText: data.raw_text,
    categoryId: data.category_id,
    notes: data.notes,
    status: data.status,
    errorMessage: data.error_message,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export interface CreateReceiptData {
  id: string;
  userId?: string | null;
  storeName?: string | null;
  storeAddress?: string | null;
  date?: Date | null;
  currency?: string;
  subtotal?: number | null;
  tax?: number | null;
  total: number;
  imagePath: string;
  receiptBoundingBox?: string | null;
  rawText?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  status?: ReceiptStatus;
  items?: Array<{
    name: string;
    inferredName?: string | null;
    productType?: string | null;
    boundingBox?: number[] | null;
    quantity?: number;
    unitPrice?: number | null;
    totalPrice: number;
    discount?: number | null;
  }>;
}

/**
 * Create a new receipt with optional items
 */
export async function createReceipt(data: CreateReceiptData): Promise<Receipt & { items: ReceiptItem[] }> {
  const supabase = getServerSupabaseClient();
  const now = new Date();

  // Insert receipt
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      id: data.id,
      user_id: data.userId || null,
      store_name: data.storeName || null,
      store_address: data.storeAddress || null,
      date: data.date?.toISOString() || null,
      currency: data.currency || "PLN",
      subtotal: data.subtotal ?? null,
      tax: data.tax ?? null,
      total: data.total,
      image_path: data.imagePath,
      receipt_bounding_box: data.receiptBoundingBox || null,
      raw_text: data.rawText || null,
      category_id: data.categoryId || null,
      notes: data.notes || null,
      status: data.status || "completed",
      error_message: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })
    .select()
    .single();

  if (receiptError) {
    throw new Error(`Failed to create receipt: ${receiptError.message}`);
  }

  // Insert items if provided
  let items: ReceiptItem[] = [];
  if (data.items && data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      id: crypto.randomUUID(),
      receipt_id: data.id,
      name: item.name,
      inferred_name: item.inferredName || null,
      product_type: item.productType || null,
      bounding_box: item.boundingBox ? JSON.stringify(item.boundingBox) : null,
      quantity: item.quantity ?? 1,
      unit_price: item.unitPrice ?? null,
      total_price: item.totalPrice,
      discount: item.discount ?? null,
      sort_order: index,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from("receipt_items")
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      throw new Error(`Failed to create receipt items: ${itemsError.message}`);
    }

    items = (insertedItems || []).map(item => ({
      id: item.id,
      receiptId: item.receipt_id,
      name: item.name,
      inferredName: item.inferred_name,
      productType: item.product_type,
      boundingBox: item.bounding_box,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      discount: item.discount,
      sortOrder: item.sort_order,
    }));
  }

  return {
    id: receipt.id,
    userId: receipt.user_id,
    storeName: receipt.store_name,
    storeAddress: receipt.store_address,
    date: receipt.date ? new Date(receipt.date) : null,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    total: receipt.total,
    imagePath: receipt.image_path,
    receiptBoundingBox: receipt.receipt_bounding_box,
    rawText: receipt.raw_text,
    categoryId: receipt.category_id,
    notes: receipt.notes,
    status: receipt.status,
    errorMessage: receipt.error_message,
    createdAt: new Date(receipt.created_at),
    updatedAt: new Date(receipt.updated_at),
    items,
  };
}

export interface UpdateReceiptData {
  storeName?: string | null;
  storeAddress?: string | null;
  date?: Date | null;
  currency?: string;
  subtotal?: number | null;
  tax?: number | null;
  total?: number;
  receiptBoundingBox?: string | null;
  categoryId?: string | null;
  notes?: string | null;
  status?: ReceiptStatus;
  errorMessage?: string | null;
  items?: Array<{
    name: string;
    inferredName?: string | null;
    productType?: string | null;
    boundingBox?: number[] | null;
    quantity?: number;
    unitPrice?: number | null;
    totalPrice: number;
    discount?: number | null;
  }>;
}

/**
 * Update an existing receipt
 */
export async function updateReceipt(id: string, data: UpdateReceiptData): Promise<Receipt & { items: ReceiptItem[] }> {
  const supabase = getServerSupabaseClient();
  const now = new Date();

  // Build update object (only include defined fields)
  const updateData: Record<string, any> = {
    updated_at: now.toISOString(),
  };

  if (data.storeName !== undefined) updateData.store_name = data.storeName;
  if (data.storeAddress !== undefined) updateData.store_address = data.storeAddress;
  if (data.date !== undefined) updateData.date = data.date?.toISOString() || null;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
  if (data.tax !== undefined) updateData.tax = data.tax;
  if (data.total !== undefined) updateData.total = data.total;
  if (data.receiptBoundingBox !== undefined) updateData.receipt_bounding_box = data.receiptBoundingBox;
  if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;

  // Update receipt
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (receiptError) {
    throw new Error(`Failed to update receipt: ${receiptError.message}`);
  }

  // Update items if provided
  let items: ReceiptItem[] = [];
  if (data.items !== undefined) {
    // Delete existing items
    const { error: deleteError } = await supabase
      .from("receipt_items")
      .delete()
      .eq("receipt_id", id);

    if (deleteError) {
      throw new Error(`Failed to delete receipt items: ${deleteError.message}`);
    }

    // Insert new items
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map((item, index) => ({
        id: crypto.randomUUID(),
        receipt_id: id,
        name: item.name,
        inferred_name: item.inferredName || null,
        product_type: item.productType || null,
        bounding_box: item.boundingBox ? JSON.stringify(item.boundingBox) : null,
        quantity: item.quantity ?? 1,
        unit_price: item.unitPrice ?? null,
        total_price: item.totalPrice,
        discount: item.discount ?? null,
        sort_order: index,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from("receipt_items")
        .insert(itemsToInsert)
        .select();

      if (itemsError) {
        throw new Error(`Failed to create receipt items: ${itemsError.message}`);
      }

      items = (insertedItems || []).map(item => ({
        id: item.id,
        receiptId: item.receipt_id,
        name: item.name,
        inferredName: item.inferred_name,
        productType: item.product_type,
        boundingBox: item.bounding_box,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        discount: item.discount,
        sortOrder: item.sort_order,
      }));
    }
  } else {
    // Fetch existing items
    const { data: existingItems, error: fetchError } = await supabase
      .from("receipt_items")
      .select("*")
      .eq("receipt_id", id)
      .order("sort_order");

    if (fetchError) {
      throw new Error(`Failed to fetch receipt items: ${fetchError.message}`);
    }

    items = (existingItems || []).map(item => ({
      id: item.id,
      receiptId: item.receipt_id,
      name: item.name,
      inferredName: item.inferred_name,
      productType: item.product_type,
      boundingBox: item.bounding_box,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      discount: item.discount,
      sortOrder: item.sort_order,
    }));
  }

  return {
    id: receipt.id,
    userId: receipt.user_id,
    storeName: receipt.store_name,
    storeAddress: receipt.store_address,
    date: receipt.date ? new Date(receipt.date) : null,
    currency: receipt.currency,
    subtotal: receipt.subtotal,
    tax: receipt.tax,
    total: receipt.total,
    imagePath: receipt.image_path,
    receiptBoundingBox: receipt.receipt_bounding_box,
    rawText: receipt.raw_text,
    categoryId: receipt.category_id,
    notes: receipt.notes,
    status: receipt.status,
    errorMessage: receipt.error_message,
    createdAt: new Date(receipt.created_at),
    updatedAt: new Date(receipt.updated_at),
    items,
  };
}

/**
 * Update receipt status only (optimized for workflow updates)
 */
export async function updateReceiptStatus(
  id: string,
  status: ReceiptStatus,
  errorMessage?: string | null
): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("receipts")
    .update({
      status,
      error_message: errorMessage ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to update receipt status: ${error.message}`);
  }
}

/**
 * Delete a receipt (items are cascade deleted)
 */
export async function deleteReceipt(id: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to delete receipt: ${error.message}`);
  }
}

/**
 * Get status for multiple receipts by IDs
 */
export async function getReceiptsStatus(ids: string[]): Promise<ReceiptStatusInfo[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("id, status, error_message, store_name, total, image_path")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to fetch receipts status: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    status: row.status,
    errorMessage: row.error_message,
    storeName: row.store_name,
    total: row.total,
    imagePath: row.image_path,
  }));
}

// ============================================================================
// Receipt Items Queries
// ============================================================================

/**
 * Get all items for a receipt
 */
export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipt_items")
    .select("*")
    .eq("receipt_id", receiptId)
    .order("sort_order");

  if (error) {
    throw new Error(`Failed to fetch receipt items: ${error.message}`);
  }

  return (data || []).map(item => ({
    id: item.id,
    receiptId: item.receipt_id,
    name: item.name,
    inferredName: item.inferred_name,
    productType: item.product_type,
    boundingBox: item.bounding_box,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    discount: item.discount,
    sortOrder: item.sort_order,
  }));
}

/**
 * Delete all items for a receipt
 */
export async function deleteReceiptItems(receiptId: string): Promise<void> {
  const supabase = getServerSupabaseClient();

  const { error } = await supabase
    .from("receipt_items")
    .delete()
    .eq("receipt_id", receiptId);

  if (error) {
    throw new Error(`Failed to delete receipt items: ${error.message}`);
  }
}

/**
 * Insert receipt items
 */
export async function insertReceiptItems(
  receiptId: string,
  items: Array<{
    name: string;
    inferredName?: string | null;
    productType?: string | null;
    boundingBox?: string | null;
    quantity?: number;
    unitPrice?: number | null;
    totalPrice: number;
    discount?: number | null;
  }>
): Promise<ReceiptItem[]> {
  if (items.length === 0) return [];

  const supabase = getServerSupabaseClient();

  const itemsToInsert = items.map((item, index) => ({
    id: crypto.randomUUID(),
    receipt_id: receiptId,
    name: item.name,
    inferred_name: item.inferredName || null,
    product_type: item.productType || null,
    bounding_box: item.boundingBox || null,
    quantity: item.quantity ?? 1,
    unit_price: item.unitPrice ?? null,
    total_price: item.totalPrice,
    discount: item.discount ?? null,
    sort_order: index,
  }));

  const { data, error } = await supabase
    .from("receipt_items")
    .insert(itemsToInsert)
    .select();

  if (error) {
    throw new Error(`Failed to insert receipt items: ${error.message}`);
  }

  return (data || []).map(item => ({
    id: item.id,
    receiptId: item.receipt_id,
    name: item.name,
    inferredName: item.inferred_name,
    productType: item.product_type,
    boundingBox: item.bounding_box,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    discount: item.discount,
    sortOrder: item.sort_order,
  }));
}

// ============================================================================
// Reports Queries (PostgreSQL-compatible)
// ============================================================================

export interface ReportsSummary {
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

/**
 * Get summary stats for a date range
 */
export async function getSummary(start: Date, end: Date): Promise<ReportsSummary> {
  const supabase = getServerSupabaseClient();

  // Get receipt totals
  const { data: receiptData, error: receiptError } = await supabase
    .from("receipts")
    .select("total")
    .gte("date", start.toISOString())
    .lt("date", end.toISOString());

  if (receiptError) {
    throw new Error(`Failed to fetch receipts for summary: ${receiptError.message}`);
  }

  const totalSpent = (receiptData || []).reduce((sum, r) => sum + (r.total || 0), 0);
  const receiptCount = (receiptData || []).length;

  // Get item count
  const { count: itemCount, error: itemError } = await supabase
    .from("receipt_items")
    .select("id, receipts!inner(date)", { count: "exact", head: true })
    .gte("receipts.date", start.toISOString())
    .lt("receipts.date", end.toISOString());

  if (itemError) {
    throw new Error(`Failed to fetch items for summary: ${itemError.message}`);
  }

  return {
    totalSpent,
    receiptCount,
    itemCount: itemCount || 0,
    avgPerReceipt: receiptCount > 0 ? totalSpent / receiptCount : 0,
  };
}

/**
 * Get spending breakdown by product type
 */
export async function getByProductType(start: Date, end: Date): Promise<ProductTypeBreakdown[]> {
  const supabase = getServerSupabaseClient();

  // Supabase doesn't support GROUP BY in the client, so we fetch and aggregate in JS
  const { data, error } = await supabase
    .from("receipt_items")
    .select("product_type, total_price, receipts!inner(date)")
    .gte("receipts.date", start.toISOString())
    .lt("receipts.date", end.toISOString());

  if (error) {
    throw new Error(`Failed to fetch product type breakdown: ${error.message}`);
  }

  // Aggregate by product type
  const byType = new Map<string, { totalSpent: number; itemCount: number }>();

  for (const item of data || []) {
    const type = item.product_type || "Other";
    const existing = byType.get(type) || { totalSpent: 0, itemCount: 0 };
    existing.totalSpent += item.total_price || 0;
    existing.itemCount += 1;
    byType.set(type, existing);
  }

  // Calculate total for percentages
  const total = Array.from(byType.values()).reduce((sum, v) => sum + v.totalSpent, 0);

  // Convert to array and sort by total spent
  const result = Array.from(byType.entries())
    .map(([productType, stats]) => ({
      productType,
      totalSpent: stats.totalSpent,
      itemCount: stats.itemCount,
      percentage: total > 0 ? (stats.totalSpent / total) * 100 : 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return result;
}

/**
 * Get spending breakdown by store
 */
export async function getByStore(start: Date, end: Date): Promise<StoreBreakdown[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("store_name, total")
    .gte("date", start.toISOString())
    .lt("date", end.toISOString());

  if (error) {
    throw new Error(`Failed to fetch store breakdown: ${error.message}`);
  }

  // Aggregate by store
  const byStore = new Map<string, { totalSpent: number; receiptCount: number }>();

  for (const receipt of data || []) {
    const store = receipt.store_name || "Unknown Store";
    const existing = byStore.get(store) || { totalSpent: 0, receiptCount: 0 };
    existing.totalSpent += receipt.total || 0;
    existing.receiptCount += 1;
    byStore.set(store, existing);
  }

  // Convert to array and sort by total spent
  const result = Array.from(byStore.entries())
    .map(([storeName, stats]) => ({
      storeName,
      totalSpent: stats.totalSpent,
      receiptCount: stats.receiptCount,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return result;
}

/**
 * Get spending breakdown by day
 */
export async function getByDay(start: Date, end: Date): Promise<DayBreakdown[]> {
  const supabase = getServerSupabaseClient();

  const { data, error } = await supabase
    .from("receipts")
    .select("date, total")
    .gte("date", start.toISOString())
    .lt("date", end.toISOString())
    .order("date");

  if (error) {
    throw new Error(`Failed to fetch daily breakdown: ${error.message}`);
  }

  // Aggregate by day
  const byDay = new Map<string, number>();

  for (const receipt of data || []) {
    if (!receipt.date) continue;
    const day = receipt.date.split("T")[0]; // Extract YYYY-MM-DD
    const existing = byDay.get(day) || 0;
    byDay.set(day, existing + (receipt.total || 0));
  }

  // Convert to array and sort by date
  const result = Array.from(byDay.entries())
    .map(([date, totalSpent]) => ({ date, totalSpent }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

// ============================================================================
// Workflow-specific Queries
// ============================================================================

export interface SaveExtractedDataParams {
  receiptId: string;
  storeName?: string | null;
  storeAddress?: string | null;
  date?: Date | null;
  currency?: string;
  receiptBoundingBox?: number[] | null;
  subtotal?: number | null;
  tax?: number | null;
  total: number;
  items: Array<{
    name: string;
    inferredName?: string | null;
    productType?: string | null;
    boundingBox?: number[] | null;
    quantity?: number;
    unitPrice?: number | null;
    totalPrice: number;
    discount?: number | null;
  }>;
}

/**
 * Save extracted receipt data from workflow (used by process-receipt workflow)
 */
export async function saveExtractedReceiptData(params: SaveExtractedDataParams): Promise<void> {
  const supabase = getServerSupabaseClient();
  const now = new Date();

  // Update receipt with extracted data
  const { error: updateError } = await supabase
    .from("receipts")
    .update({
      store_name: params.storeName || null,
      store_address: params.storeAddress || null,
      date: params.date?.toISOString() || null,
      currency: params.currency || "PLN",
      receipt_bounding_box: params.receiptBoundingBox
        ? JSON.stringify(params.receiptBoundingBox)
        : null,
      subtotal: params.subtotal ?? null,
      tax: params.tax ?? null,
      total: params.total,
      status: "completed",
      updated_at: now.toISOString(),
    })
    .eq("id", params.receiptId);

  if (updateError) {
    throw new Error(`Failed to update receipt with extracted data: ${updateError.message}`);
  }

  // Delete existing items (in case of retry)
  const { error: deleteError } = await supabase
    .from("receipt_items")
    .delete()
    .eq("receipt_id", params.receiptId);

  if (deleteError) {
    throw new Error(`Failed to delete existing receipt items: ${deleteError.message}`);
  }

  // Insert new items
  if (params.items.length > 0) {
    const itemsToInsert = params.items.map((item, index) => ({
      id: crypto.randomUUID(),
      receipt_id: params.receiptId,
      name: item.name,
      inferred_name: item.inferredName || null,
      product_type: item.productType || null,
      bounding_box: item.boundingBox ? JSON.stringify(item.boundingBox) : null,
      quantity: item.quantity ?? 1,
      unit_price: item.unitPrice ?? null,
      total_price: item.totalPrice,
      discount: item.discount ?? null,
      sort_order: index,
    }));

    const { error: insertError } = await supabase
      .from("receipt_items")
      .insert(itemsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert receipt items: ${insertError.message}`);
    }
  }
}
