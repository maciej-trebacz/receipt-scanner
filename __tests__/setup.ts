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
