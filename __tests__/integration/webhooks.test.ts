import { describe, test, expect, mock, beforeEach } from "bun:test";

let mockUsers: Map<string, { id: string; email: string; name: string | null }>;

function resetMocks() {
  mockUsers = new Map();
}

// Mock supabase module to prevent actual DB connections during tests
mock.module("@/lib/db/supabase", () => ({
  getServerSupabaseClient: () => ({}),
  createServerSupabaseClient: () => ({}),
  createBrowserSupabaseClient: () => ({}),
  createServiceRoleClient: () => ({}),
}));

mock.module("@/lib/db/queries", () => ({
  createUser: async (data: { id: string; email: string; name: string | null }) => {
    mockUsers.set(data.id, data);
    return { ...data, credits: 5, createdAt: new Date(), updatedAt: new Date() };
  },
  deleteUser: async (id: string) => {
    mockUsers.delete(id);
    return { success: true };
  },
  updateUser: async (id: string, data: { email?: string; name?: string | null }) => {
    const existing = mockUsers.get(id);
    if (existing) {
      const updated = { ...existing, ...data };
      mockUsers.set(id, updated);
      return updated;
    }
    return null;
  },
}));

mock.module("svix", () => ({
  Webhook: class {
    constructor(_secret: string) {}
    verify(_body: string, _headers: Record<string, string>) {
      return JSON.parse(_body);
    }
  },
}));

mock.module("next/headers", () => ({
  headers: async () => new Map([
    ["svix-id", "test-id"],
    ["svix-timestamp", "test-timestamp"],
    ["svix-signature", "test-signature"],
  ]),
}));

const { POST } = await import("@/app/api/webhooks/clerk/route");

function createWebhookRequest(payload: unknown): Request {
  return new Request("http://localhost:3000/api/webhooks/clerk", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "svix-id": "test-id",
      "svix-timestamp": "test-timestamp",
      "svix-signature": "test-signature",
    },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    resetMocks();
    process.env.CLERK_WEBHOOK_SECRET = "test-secret";
  });

  test("handles user.created event", async () => {
    const payload = {
      type: "user.created",
      data: {
        id: "user_123",
        email_addresses: [{ email_address: "test@example.com" }],
        first_name: "Test",
        last_name: "User",
      },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUsers.has("user_123")).toBe(true);

    const user = mockUsers.get("user_123");
    expect(user?.email).toBe("test@example.com");
    expect(user?.name).toBe("Test User");
  });

  test("handles user.deleted event", async () => {
    mockUsers.set("user_to_delete", {
      id: "user_to_delete",
      email: "delete@example.com",
      name: "Delete Me",
    });

    const payload = {
      type: "user.deleted",
      data: { id: "user_to_delete" },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockUsers.has("user_to_delete")).toBe(false);
  });

  test("handles user.updated event", async () => {
    mockUsers.set("user_update", {
      id: "user_update",
      email: "old@example.com",
      name: "Old Name",
    });

    const payload = {
      type: "user.updated",
      data: {
        id: "user_update",
        email_addresses: [{ email_address: "new@example.com" }],
        first_name: "New",
        last_name: "Name",
      },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);

    const user = mockUsers.get("user_update");
    expect(user?.email).toBe("new@example.com");
    expect(user?.name).toBe("New Name");
  });

  test("handles name with only first name", async () => {
    const payload = {
      type: "user.created",
      data: {
        id: "user_first_only",
        email_addresses: [{ email_address: "first@example.com" }],
        first_name: "FirstOnly",
        last_name: null,
      },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const user = mockUsers.get("user_first_only");
    expect(user?.name).toBe("FirstOnly");
  });

  test("handles user with no name", async () => {
    const payload = {
      type: "user.created",
      data: {
        id: "user_no_name",
        email_addresses: [{ email_address: "noname@example.com" }],
        first_name: null,
        last_name: null,
      },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const user = mockUsers.get("user_no_name");
    expect(user?.name).toBeNull();
  });

  test("returns OK for unknown event types", async () => {
    const payload = {
      type: "organization.created",
      data: { id: "org_123" },
    };

    const req = createWebhookRequest(payload);
    const res = await POST(req);

    expect(res.status).toBe(200);
  });
});
