import { v4 as uuid } from "uuid";

export interface TestUser {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const now = new Date();
  return {
    id: `user_${uuid().slice(0, 8)}`,
    email: `test-${uuid().slice(0, 8)}@example.com`,
    name: "Test User",
    credits: 10,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createUserWithCredits(credits: number): TestUser {
  return createTestUser({ credits });
}

export function createUserWithoutCredits(): TestUser {
  return createTestUser({ credits: 0 });
}

export const DEFAULT_TEST_USER = createTestUser({
  id: "test-user-123",
  email: "test@example.com",
  name: "Test User",
  credits: 10,
});
