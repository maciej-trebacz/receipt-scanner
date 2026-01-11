# Additional E2E Tests Specification

The existing `e2e/supabase-migration.spec.ts` covers API endpoints and basic navigation. Add these tests for full regression coverage.

## 1. Full Receipt Lifecycle (`receipt-lifecycle.spec.ts`)

### Upload → View → Edit → Delete
- Upload a receipt image via the home page
- Wait for processing to complete (status polling)
- Navigate to the new receipt detail page
- Verify extracted data displays (store, total, items)
- Edit receipt fields (store name, date, total)
- Save and verify changes persist
- Delete the receipt
- Verify it's removed from the list

### Bulk Upload Flow
- Upload 2-3 images simultaneously
- Verify progress indicators for each
- Verify status polling updates each receipt
- Verify all appear in list when complete

## 2. Reports Page (`reports.spec.ts`)

### Period Navigation
- Navigate to `/reports`
- Verify default period loads (current week/month)
- Click prev/next arrows, verify data updates
- Switch between week/month/year views
- Verify period label updates correctly

### Charts and Breakdowns
- Verify spending by product type section renders
- Verify spending by store section renders
- Verify daily spending chart renders
- Verify totals match across sections

## 3. Receipt Detail Interactions (`receipt-detail.spec.ts`)

### Line Items
- Load a receipt with multiple items
- Verify all items display with names and prices
- Verify inferred names show when available
- Verify product types display

### Bounding Box Overlay
- Hover over a line item
- Verify bounding box overlay appears on image
- Move mouse away, verify overlay disappears

### Image Display
- Verify receipt image loads from Supabase Storage
- Verify cropped view works (if bounding box exists)

## 4. Reanalyze Flow (`reanalyze.spec.ts`)

- Navigate to a receipt detail page
- Click reanalyze button
- Verify status changes to "processing"
- Wait for completion
- Verify data may have updated

## 5. Mobile Viewport (`mobile.spec.ts`)

Run with `viewport: { width: 375, height: 667 }`:

- Verify bottom navigation is visible
- Verify header navigation is hidden
- Navigate between pages using bottom nav
- Verify receipt list is scrollable
- Verify receipt detail is usable

## 6. Error States (`error-states.spec.ts`)

- Upload an invalid file type, verify error message
- Simulate failed processing, verify error display in list
- Verify failed receipts show error message in detail view

## Test Fixtures Needed

Create `e2e/fixtures/`:
- `test-receipt.jpg` - A real receipt image for upload tests
- `test-receipt-2.jpg` - Second receipt for bulk upload

## Notes

- Use `page.locator().first()` for elements that appear twice (mobile + desktop nav)
- Reports API returns `summary.totalSpent`, not `totalSpent` at root
- Status polling uses POST `/api/receipts/status` with `{ ids: [...] }`
- Image URLs are `/api/image/${imagePath}` (note the slash)
