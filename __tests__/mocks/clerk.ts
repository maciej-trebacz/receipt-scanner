import { mock } from "bun:test";
import { TEST_USER_ID, TEST_USER_EMAIL } from "../setup";

export interface MockAuthOptions {
  userId?: string | null;
  email?: string;
  firstName?: string;
  lastName?: string;
}

export function mockAuth(options: MockAuthOptions = {}) {
  const {
    userId = TEST_USER_ID,
    email = TEST_USER_EMAIL,
    firstName = "Test",
    lastName = "User",
  } = options;

  mock.module("@clerk/nextjs/server", () => ({
    auth: async () => ({ userId }),
    currentUser: async () =>
      userId
        ? {
            id: userId,
            emailAddresses: [{ emailAddress: email }],
            firstName,
            lastName,
          }
        : null,
  }));

  mock.module("@/lib/auth", () => ({
    requireAuth: async () => {
      if (!userId) throw new Error("Unauthorized");
      return userId;
    },
    getAuthUserId: async () => userId,
    requireAuthWithUser: async () => {
      if (!userId) throw new Error("Unauthorized");
      return userId;
    },
  }));
}

export function mockUnauthenticated() {
  mockAuth({ userId: null });
}

export function mockAuthenticatedAs(userId: string, email?: string) {
  mockAuth({ userId, email });
}
