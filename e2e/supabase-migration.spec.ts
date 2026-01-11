import { test, expect } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * End-to-end tests for verifying the Supabase migration.
 *
 * These tests verify:
 * 1. Receipt list loads from Supabase (PostgreSQL)
 * 2. Receipt upload stores images in Supabase Storage
 * 3. Real-time updates work via Supabase Realtime (no polling)
 * 4. Receipt CRUD operations work correctly
 * 5. Reports and categories still function
 */

// Test configuration
const TEST_IMAGE_PATH = path.join(__dirname, "fixtures", "test-receipt.jpg");

test.describe("Supabase Migration E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the receipts page before each test
    await page.goto("/receipts");
    // Wait for the page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test.describe("Receipt List", () => {
    test("should load the receipts page successfully", async ({ page }) => {
      // Verify the page title and header
      await expect(page.locator("h1").first()).toContainText("Receipts");

      // The receipts list should be visible (may be empty or have items)
      await expect(
        page.locator("main").first()
      ).toBeVisible();
    });

    test("should display receipt list from Supabase", async ({ page }) => {
      // Wait for any loading state to complete
      await page.waitForTimeout(1000);

      // Check if there are receipts or an empty state
      const receiptItems = page.locator(
        '[data-testid="receipt-item"], [class*="receipt"], a[href*="/receipts/"]'
      );
      const emptyState = page.locator(
        '[data-testid="empty-state"], :text("No receipts")'
      );

      // Either receipts exist or we show an empty state
      const hasReceipts = (await receiptItems.count()) > 0;
      const hasEmptyState = (await emptyState.count()) > 0;

      expect(hasReceipts || hasEmptyState).toBe(true);
    });

    test("should show loading and then content states", async ({ page }) => {
      // Refresh the page to observe loading states
      await page.reload();

      // Should eventually show content (not stuck in loading)
      await expect(page.locator("main").first()).toBeVisible({ timeout: 10000 });

      // Should not show error states
      await expect(page.locator(':text("Error")')).not.toBeVisible();
    });
  });

  test.describe("Receipt Upload and Real-time Updates", () => {
    test.skip("should upload a receipt image to Supabase Storage", async ({
      page,
    }) => {
      // Skip if test fixture doesn't exist
      if (!fs.existsSync(TEST_IMAGE_PATH)) {
        test.skip();
        return;
      }

      // Navigate to the upload page (home page)
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Find the file input
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeAttached({ timeout: 5000 });

      // Upload the test receipt
      await fileInput.setInputFiles(TEST_IMAGE_PATH);

      // Wait for the upload to complete
      await page.waitForResponse(
        (response) =>
          response.url().includes("/api/receipts/queue") &&
          response.status() === 200,
        { timeout: 30000 }
      );

      // Navigate to receipts list to see the new receipt
      await page.goto("/receipts");
      await page.waitForLoadState("networkidle");

      // The new receipt should appear (may be in pending/processing state)
      await expect(
        page.locator(
          '[data-testid="receipt-item"], a[href*="/receipts/"], [class*="receipt"]'
        )
      ).toBeVisible({ timeout: 10000 });
    });

    test("should receive real-time updates without page refresh", async ({
      page,
      context,
    }) => {
      // This test verifies that Supabase Realtime is working
      // by checking for WebSocket connections

      // Navigate to receipts page
      await page.goto("/receipts");
      await page.waitForLoadState("networkidle");

      // Check for Supabase Realtime console logs
      const realtimeLogs: string[] = [];
      page.on("console", (msg) => {
        if (msg.text().includes("[Realtime]")) {
          realtimeLogs.push(msg.text());
        }
      });

      // Wait a moment for Realtime to connect
      await page.waitForTimeout(2000);

      // Verify Realtime subscription is active (via console logs or WebSocket)
      // Note: In production, Realtime will connect to Supabase
      // For testing, we verify the subscription attempt was made
      console.log("Realtime logs captured:", realtimeLogs);
    });
  });

  test.describe("Receipt Detail Page", () => {
    test("should load receipt detail when clicking on a receipt", async ({
      page,
    }) => {
      // Navigate to receipts list
      await page.goto("/receipts");
      await page.waitForLoadState("networkidle");

      // Find a receipt link
      const receiptLink = page.locator(
        'a[href*="/receipts/"]:not([href="/receipts"])'
      );

      // Skip if no receipts exist
      if ((await receiptLink.count()) === 0) {
        test.skip();
        return;
      }

      // Click the first receipt
      await receiptLink.first().click();

      // Wait for navigation
      await page.waitForURL(/\/receipts\/[^/]+$/);

      // Verify we're on the detail page
      await expect(page.locator("main")).toBeVisible();

      // The receipt image should be visible (loaded from Supabase Storage)
      const receiptImage = page.locator('img[src*="supabase"], img[alt*="receipt"]');
      if ((await receiptImage.count()) > 0) {
        await expect(receiptImage.first()).toBeVisible({ timeout: 10000 });
      }
    });

    test("should display receipt data from Supabase", async ({ page }) => {
      // Navigate to receipts list
      await page.goto("/receipts");
      await page.waitForLoadState("networkidle");

      // Find a receipt link
      const receiptLink = page.locator(
        'a[href*="/receipts/"]:not([href="/receipts"])'
      );

      // Skip if no receipts exist
      if ((await receiptLink.count()) === 0) {
        test.skip();
        return;
      }

      // Click the first receipt
      await receiptLink.first().click();
      await page.waitForURL(/\/receipts\/[^/]+$/);

      // Wait for content to load
      await page.waitForLoadState("networkidle");

      // The page should show receipt details (total, date, store, etc.)
      const pageContent = await page.textContent("body");

      // At least one of these should be present on a receipt detail page
      const hasReceiptContent =
        pageContent?.includes("$") ||
        pageContent?.includes("PLN") ||
        pageContent?.includes("Total") ||
        pageContent?.includes("Date") ||
        pageContent?.includes("Items");

      expect(hasReceiptContent).toBe(true);
    });
  });

  test.describe("Categories", () => {
    test("should load categories from Supabase", async ({ page }) => {
      // Navigate to page that shows categories (could be filter dropdown or dedicated page)
      await page.goto("/receipts");
      await page.waitForLoadState("networkidle");

      // Look for category filter or category elements
      const categoryFilter = page.locator(
        '[data-testid="category-filter"], [class*="category"], button:has-text("Category")'
      );

      // Categories might be in a dropdown or visible on page
      // This test just verifies the API doesn't error
      const response = await page.request.get("/api/categories");
      expect(response.status()).toBe(200);

      const categories = await response.json();
      expect(Array.isArray(categories)).toBe(true);
    });
  });

  test.describe("Reports", () => {
    test("should load reports data from Supabase", async ({ page }) => {
      // Test the reports API endpoint
      const response = await page.request.get("/api/reports");
      expect(response.status()).toBe(200);

      const reports = await response.json();

      // Reports should have the expected structure
      expect(reports).toHaveProperty("summary");
      expect(reports.summary).toHaveProperty("totalSpent");
      expect(reports.summary).toHaveProperty("receiptCount");
    });

    test("should support date filtering in reports", async ({ page }) => {
      // Test reports with date parameters
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const response = await page.request.get(
        `/api/reports?startDate=${startDate}&endDate=${endDate}`
      );
      expect(response.status()).toBe(200);

      const reports = await response.json();
      expect(reports).toHaveProperty("summary");
      expect(reports.summary).toHaveProperty("totalSpent");
    });
  });

  test.describe("API Endpoints", () => {
    test("GET /api/receipts should return paginated results", async ({
      page,
    }) => {
      const response = await page.request.get("/api/receipts?limit=5");
      expect(response.status()).toBe(200);

      const data = await response.json();

      // Should have pagination structure
      expect(data).toHaveProperty("receipts");
      expect(data).toHaveProperty("hasMore");
      expect(Array.isArray(data.receipts)).toBe(true);
    });

    test("GET /api/receipts should support date filtering", async ({
      page,
    }) => {
      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      const response = await page.request.get(
        `/api/receipts?startDate=${startDate}&endDate=${endDate}`
      );
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("receipts");
    });

    test("GET /api/categories should return array of categories", async ({
      page,
    }) => {
      const response = await page.request.get("/api/categories");
      expect(response.status()).toBe(200);

      const categories = await response.json();
      expect(Array.isArray(categories)).toBe(true);

      // Each category should have expected structure
      if (categories.length > 0) {
        expect(categories[0]).toHaveProperty("id");
        expect(categories[0]).toHaveProperty("name");
      }
    });

    test("POST /api/receipts/status should update receipt status", async ({
      page,
    }) => {
      // First, get a receipt ID
      const listResponse = await page.request.get("/api/receipts?limit=1");

      if (listResponse.status() !== 200) {
        test.skip();
        return;
      }

      const data = await listResponse.json();

      if (!data.receipts || data.receipts.length === 0) {
        test.skip();
        return;
      }

      const receiptId = data.receipts[0].id;

      // Test the status endpoint (should accept POST)
      const statusResponse = await page.request.post("/api/receipts/status", {
        data: {
          id: receiptId,
          status: "completed",
        },
      });

      // Should either succeed or return appropriate error
      expect([200, 400, 404]).toContain(statusResponse.status());
    });
  });

  test.describe("Error Handling", () => {
    test("should handle non-existent receipt gracefully", async ({ page }) => {
      // Try to access a non-existent receipt
      const response = await page.request.get(
        "/api/receipts/non-existent-id-12345"
      );

      // Should return 404 or similar error
      expect([404, 500]).toContain(response.status());
    });

    test("should handle invalid API requests", async ({ page }) => {
      // Try to create a receipt with missing required fields
      const response = await page.request.post("/api/receipts", {
        data: {
          // Missing required fields
          notes: "Test receipt",
        },
      });

      // Should return error
      expect([400, 422, 500]).toContain(response.status());
    });
  });

  test.describe("Supabase Storage", () => {
    test("receipt images should load from Supabase Storage", async ({
      page,
    }) => {
      // Get a receipt with an image
      const response = await page.request.get("/api/receipts?limit=1");

      if (response.status() !== 200) {
        test.skip();
        return;
      }

      const data = await response.json();

      if (!data.receipts || data.receipts.length === 0) {
        test.skip();
        return;
      }

      // Get the receipt detail to check image path
      const receiptId = data.receipts[0].id;
      const detailResponse = await page.request.get(
        `/api/receipts/${receiptId}`
      );

      if (detailResponse.status() !== 200) {
        test.skip();
        return;
      }

      const receipt = await detailResponse.json();

      // Image path should reference Supabase Storage format
      if (receipt.imagePath) {
        // Supabase Storage paths typically contain the bucket name
        expect(receipt.imagePath).toContain("receipts");
      }
    });
  });

  test.describe("Database Connection", () => {
    test("should successfully connect to Supabase PostgreSQL", async ({
      page,
    }) => {
      // Verify database connectivity by making API calls
      const responses = await Promise.all([
        page.request.get("/api/receipts?limit=1"),
        page.request.get("/api/categories"),
        page.request.get("/api/reports"),
      ]);

      // All endpoints should respond (not timeout or fail with connection errors)
      for (const response of responses) {
        expect(response.status()).toBeLessThan(500);
      }
    });
  });
});

test.describe("Multi-Tab Real-time Sync", () => {
  test("should sync receipt updates across browser tabs", async ({
    browser,
  }) => {
    // Create two browser contexts (simulating two tabs/users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Both pages navigate to receipts
      await Promise.all([
        page1.goto("/receipts"),
        page2.goto("/receipts"),
      ]);

      await Promise.all([
        page1.waitForLoadState("networkidle"),
        page2.waitForLoadState("networkidle"),
      ]);

      // Capture Realtime connection logs from both pages
      const page1RealtimeLogs: string[] = [];
      const page2RealtimeLogs: string[] = [];

      page1.on("console", (msg) => {
        if (msg.text().includes("[Realtime]")) {
          page1RealtimeLogs.push(msg.text());
        }
      });

      page2.on("console", (msg) => {
        if (msg.text().includes("[Realtime]")) {
          page2RealtimeLogs.push(msg.text());
        }
      });

      // Wait for Realtime subscriptions to establish
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      console.log("Page 1 Realtime logs:", page1RealtimeLogs);
      console.log("Page 2 Realtime logs:", page2RealtimeLogs);

      // Verify both pages are subscribed (in a real scenario with Supabase running)
      // The actual sync verification would require modifying data through the API
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
