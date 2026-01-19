/**
 * Global test setup for Bun tests.
 * This file is preloaded before all tests run.
 */

import { mock } from "bun:test";

// Set test environment
process.env.NODE_ENV = "test";

// Default test user ID for auth mocking
export const TEST_USER_ID = "test-user-123";
export const TEST_USER_EMAIL = "test@example.com";

// Mock Supabase to prevent real database connections
// This must be mocked before any module that imports from queries.ts
mock.module("@/lib/db/supabase", () => ({
  getServerSupabaseClient: () => ({
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: null, error: null }),
      update: () => ({ data: null, error: null }),
      delete: () => ({ data: null, error: null }),
    }),
    storage: {
      from: () => ({
        download: () => ({ data: null, error: null }),
        upload: () => ({ data: null, error: null }),
        createSignedUploadUrl: () => ({ data: null, error: null }),
      }),
    },
  }),
  createServerSupabaseClient: () => ({}),
  createBrowserSupabaseClient: () => ({}),
  createServiceRoleClient: () => ({}),
}));

// Mock Clerk auth by default
mock.module("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: TEST_USER_ID }),
  currentUser: async () => ({
    id: TEST_USER_ID,
    emailAddresses: [{ emailAddress: TEST_USER_EMAIL }],
    firstName: "Test",
    lastName: "User",
  }),
}));

// Mock lib/auth module
mock.module("@/lib/auth", () => ({
  requireAuth: async () => TEST_USER_ID,
  getAuthUserId: async () => TEST_USER_ID,
  requireAuthWithUser: async () => TEST_USER_ID,
}));

// Configurable mock handlers for @/lib/db/queries
// Tests can modify these via `globalThis.mockQueries`
export interface MockQueryHandlers {
  createUser?: (data: any) => Promise<any>;
  getUser?: (id: string) => Promise<any>;
  ensureUser?: (user: any) => Promise<any>;
  deleteUser?: (id: string) => Promise<any>;
  updateUser?: (id: string, data: any) => Promise<any>;
  getAllCategories?: () => Promise<any[]>;
  getCategoryById?: (id: string) => Promise<any>;
  listReceipts?: (params: any) => Promise<any>;
  getReceiptById?: (id: string) => Promise<any>;
  receiptExists?: (id: string) => Promise<boolean>;
  createReceipt?: (data: any) => Promise<any>;
  updateReceipt?: (id: string, data: any) => Promise<any>;
  deleteReceipt?: (id: string) => Promise<any>;
}

// Global storage for mock handlers that tests can modify
declare global {
  var mockQueryHandlers: MockQueryHandlers;
}
globalThis.mockQueryHandlers = {};

// Default stub that throws if not overridden
const defaultStub = (name: string) => async (..._args: any[]) => {
  throw new Error(`Query function ${name} not implemented in test - set globalThis.mockQueryHandlers.${name}`);
};

mock.module("@/lib/db/queries", () => ({
  // User functions
  createUser: async (data: any) => globalThis.mockQueryHandlers.createUser?.(data) ?? defaultStub("createUser")(),
  getUser: async (id: string) => globalThis.mockQueryHandlers.getUser?.(id) ?? null,
  ensureUser: async (user: any) => globalThis.mockQueryHandlers.ensureUser?.(user) ?? defaultStub("ensureUser")(),
  deleteUser: async (id: string) => globalThis.mockQueryHandlers.deleteUser?.(id) ?? defaultStub("deleteUser")(),
  updateUser: async (id: string, data: any) => globalThis.mockQueryHandlers.updateUser?.(id, data) ?? defaultStub("updateUser")(),
  updateUserCredits: defaultStub("updateUserCredits"),
  updateUserPreferences: defaultStub("updateUserPreferences"),

  // Transaction functions
  createCreditTransaction: defaultStub("createCreditTransaction"),
  getUserTransactions: defaultStub("getUserTransactions"),

  // Category functions
  getAllCategories: async () => globalThis.mockQueryHandlers.getAllCategories?.() ?? [],
  getCategoryById: async (id: string) => globalThis.mockQueryHandlers.getCategoryById?.(id) ?? null,
  createCategory: defaultStub("createCategory"),

  // Receipt functions
  listReceipts: async (params: any) => globalThis.mockQueryHandlers.listReceipts?.(params) ?? { receipts: [], hasMore: false },
  getReceiptById: async (id: string) => globalThis.mockQueryHandlers.getReceiptById?.(id) ?? null,
  receiptExists: async (id: string) => globalThis.mockQueryHandlers.receiptExists?.(id) ?? false,
  getReceiptSimple: async () => null,
  createReceipt: async (data: any) => globalThis.mockQueryHandlers.createReceipt?.(data) ?? defaultStub("createReceipt")(),
  updateReceipt: async (id: string, data: any) => globalThis.mockQueryHandlers.updateReceipt?.(id, data) ?? defaultStub("updateReceipt")(),
  updateReceiptStatus: defaultStub("updateReceiptStatus"),
  deleteReceipt: async (id: string) => globalThis.mockQueryHandlers.deleteReceipt?.(id) ?? defaultStub("deleteReceipt")(),
  getReceiptsStatus: async () => [],

  // Receipt items functions
  getReceiptItems: async () => [],
  deleteReceiptItems: defaultStub("deleteReceiptItems"),
  insertReceiptItems: defaultStub("insertReceiptItems"),

  // Reports functions
  getSummary: async () => ({ totalSpent: 0, receiptCount: 0, itemCount: 0, avgPerReceipt: 0 }),
  getByProductType: async () => [],
  getByStore: async () => [],
  getByDay: async () => [],
  saveExtractedReceiptData: defaultStub("saveExtractedReceiptData"),
}));
