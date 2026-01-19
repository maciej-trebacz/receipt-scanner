# E2E Test Plan

## Overview

This document outlines the E2E tests to be implemented using Playwright. These tests verify critical user flows work correctly in a real browser environment.

## Test Structure

```
e2e/
├── fixtures/
│   └── test-receipt.jpg    # Sample receipt image
├── flows/
│   ├── receipt-lifecycle.spec.ts
│   ├── bulk-upload.spec.ts
│   ├── reports.spec.ts
│   └── mobile.spec.ts
└── playwright.config.ts
```

## Test Flows

### 1. Receipt Lifecycle (`receipt-lifecycle.spec.ts`)

Complete receipt CRUD operations from user perspective.

```typescript
test("complete receipt lifecycle", async ({ page }) => {
  // 1. Upload receipt
  await page.goto("/dashboard");
  await page.setInputFiles('[data-testid="file-input"]', "fixtures/test-receipt.jpg");
  await expect(page.locator('[data-testid="receipt-card"]')).toBeVisible();

  // 2. Wait for AI processing
  await expect(page.locator('[data-testid="status-completed"]')).toBeVisible({ timeout: 30000 });

  // 3. View detail
  await page.click('[data-testid="receipt-card"]');
  await expect(page.locator('[data-testid="receipt-detail"]')).toBeVisible();

  // 4. Edit receipt (tests categoryId empty string fix)
  await page.click('[data-testid="edit-button"]');
  await page.fill('[name="storeName"]', "Updated Store");
  // Don't select category (triggers empty string scenario)
  await page.click('[data-testid="save-button"]');
  await expect(page.locator('.toast-error')).not.toBeVisible();

  // 5. Delete receipt
  await page.click('[data-testid="delete-button"]');
  await page.click('[data-testid="confirm-delete"]');
  await expect(page.locator('[data-testid="receipt-detail"]')).not.toBeVisible();
});

test("edit receipt with category change", async ({ page }) => {
  // Navigate to existing receipt
  // Change category from one to another
  // Verify category persists
});

test("clear category from receipt", async ({ page }) => {
  // Navigate to receipt with category
  // Clear the category
  // Verify categoryId becomes null (not empty string error)
});
```

### 2. Bulk Upload (`bulk-upload.spec.ts`)

Test multiple file uploads and processing.

```typescript
test("upload multiple receipts", async ({ page }) => {
  // Upload 3 receipts
  // Verify all appear in list
  // Verify each processes successfully
});

test("handles mixed file types", async ({ page }) => {
  // Upload JPEG, PNG, WebP
  // All should process
});

test("rejects invalid file type", async ({ page }) => {
  // Try to upload PDF
  // Verify error message
});
```

### 3. Reports Navigation (`reports.spec.ts`)

Test reports page functionality.

```typescript
test("navigate reports by period", async ({ page }) => {
  await page.goto("/reports");

  // Week view
  await page.click('[data-testid="period-week"]');
  await expect(page.locator('[data-testid="date-range"]')).toContainText("Mon");

  // Navigate previous/next
  await page.click('[data-testid="prev-period"]');
  // Verify date changed

  // Month view
  await page.click('[data-testid="period-month"]');
  // Verify charts render

  // Year view
  await page.click('[data-testid="period-year"]');
  // Verify yearly aggregates
});

test("reports show correct data", async ({ page }) => {
  // Create receipt with known total
  // Navigate to reports
  // Verify total matches
});
```

### 4. Mobile Viewport (`mobile.spec.ts`)

Test mobile-specific behavior.

```typescript
test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("shows bottom navigation", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="bottom-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="desktop-nav"]')).not.toBeVisible();
  });

  test("camera capture works", async ({ page }) => {
    // Test camera UI on mobile
  });

  test("swipe to delete on receipt list", async ({ page }) => {
    // If implemented - test swipe gestures
  });
});
```

## Prerequisites

1. Test receipt images in `e2e/fixtures/`
2. Test user credentials or auth bypass for E2E
3. Clean test database state (or use Supabase test project)

## Running E2E Tests

```bash
# Run all E2E tests
bun test:e2e

# Run with UI mode (debugging)
bun test:e2e:ui

# Run headed (see browser)
bun test:e2e:headed
```

## Data Attributes Required

Add these `data-testid` attributes to components:

| Attribute | Component | Purpose |
|-----------|-----------|---------|
| `file-input` | Upload input | Select files |
| `receipt-card` | Receipt list item | Click to view |
| `receipt-detail` | Detail page container | Verify loaded |
| `status-completed` | Status badge | Processing done |
| `status-pending` | Status badge | Processing |
| `status-failed` | Status badge | Error |
| `edit-button` | Edit button | Enter edit mode |
| `save-button` | Save button | Confirm edit |
| `delete-button` | Delete button | Start deletion |
| `confirm-delete` | Confirm dialog | Confirm deletion |
| `bottom-nav` | Mobile nav | Mobile layout |
| `desktop-nav` | Desktop nav | Desktop layout |
| `period-week` | Period selector | Week view |
| `period-month` | Period selector | Month view |
| `period-year` | Period selector | Year view |
| `prev-period` | Navigation | Previous period |
| `next-period` | Navigation | Next period |
| `date-range` | Date display | Current range |

## Authentication

For E2E tests, use Clerk's test mode or implement auth bypass:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: 'e2e/.auth/user.json', // Pre-authenticated state
  },
});
```

Or setup auth before each test:
```typescript
test.beforeEach(async ({ page }) => {
  // Use Clerk's testing tokens
  // Or implement auth bypass middleware for test env
});
```

## CI Considerations

E2E tests are slower and require a running server. Run separately from unit/integration tests:

```yaml
# In GitHub Actions
jobs:
  e2e:
    needs: [test] # Run after unit tests pass
    steps:
      - run: bun install
      - run: bunx playwright install --with-deps
      - run: bun test:e2e
```

## Priority Order

1. Receipt lifecycle (validates core functionality + bug fix)
2. Reports navigation (critical user feature)
3. Mobile viewport (validates responsive design)
4. Bulk upload (edge cases)
