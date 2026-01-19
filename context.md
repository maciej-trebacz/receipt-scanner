# Paragone

## Overview

Mobile-first web app to scan receipts via camera/upload, extract data with AI, and track expenses with reports.

## Production

- **URL**: https://paragone.app
- **Hosting**: Vercel
- **Auth**: Clerk (production instance)
- **Domain**: paragone.app (DNS on Vercel)

## Status

**Phase**: 6 Complete (Async Processing)
**Tests**: 20 passing
**Next**: Phase 7 (Polish) or Phase 8 (Test Coverage)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Runtime | Bun |
| Language | TypeScript 5 |
| UI | React 19.2.3 |
| Styling | Tailwind CSS 4 |
| Components | Shadcn (radix-maia style) |
| Icons | Hugeicons |
| Auth | Clerk |
| Database | Supabase (Postgres) + Drizzle ORM |
| Storage | Supabase Storage |
| AI | Gemini 2.0 Flash |
| Async | Vercel Workflow (durable execution) |

## Commands

```bash
cd projects/receipt-scanner

bun dev                    # Dev server on :3000
bun build                  # Production build
bun start                  # Production server
bun test                   # Run all tests
bun lib/db/migrate.ts      # Run database migrations
bun lib/db/seed.ts         # Seed default categories
```

## Project Structure

```
receipt-scanner/
├── app/
│   ├── api/
│   │   ├── upload/route.ts           # Image upload
│   │   ├── scan/route.ts             # Gemini OCR (legacy sync)
│   │   ├── receipts/
│   │   │   ├── route.ts              # List/Create receipts
│   │   │   ├── route.test.ts         # API tests
│   │   │   ├── queue/route.ts        # Async upload + queue workflow
│   │   │   ├── status/route.ts       # Batch status check
│   │   │   ├── stream/route.ts       # SSE real-time updates
│   │   │   └── [id]/
│   │   │       ├── route.ts          # Single receipt CRUD
│   │   │       └── reanalyze/route.ts # Re-scan existing receipt
│   │   ├── reports/route.ts          # Spending reports API
│   │   ├── categories/route.ts       # List categories
│   │   └── image/[...path]/route.ts  # Serve images
│   ├── receipts/
│   │   ├── page.tsx                  # Receipt list
│   │   └── [id]/page.tsx             # Receipt detail (split layout on desktop)
│   ├── reports/page.tsx              # Reports with charts
│   ├── page.tsx                      # Dashboard with capture + stats
│   ├── layout.tsx                    # Root layout + nav
│   └── globals.css                   # Glass utilities
├── components/
│   ├── ui/                           # Shadcn components (14)
│   ├── receipt-capture.tsx           # Camera/gallery input
│   ├── receipt-card.tsx              # Receipt summary card
│   ├── receipt-list.tsx              # Filterable list
│   ├── receipt-form.tsx              # Edit form
│   ├── receipt-image-overlay.tsx     # Bounding box overlay
│   ├── category-picker.tsx           # Category dropdown
│   ├── nav-bar.tsx                   # Mobile bottom navigation
│   ├── desktop-nav.tsx               # Desktop header navigation
│   ├── period-selector.tsx           # Week/Month/Year tabs + nav arrows
│   └── spending-chart.tsx            # CSS bar chart
├── lib/
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema
│   │   ├── index.ts                  # DB connection
│   │   ├── migrate.ts                # Create tables
│   │   ├── seed.ts                   # Seed categories
│   │   └── db.test.ts                # DB tests
│   ├── reports.ts                    # Reports query helpers
│   ├── gemini.ts                     # AI extraction
│   ├── gemini.test.ts                # Parsing tests
│   └── utils.ts
├── data/
│   ├── receipts.db                   # SQLite database
│   └── uploads/receipts/             # Uploaded images
├── drizzle.config.ts
└── .env.local.example
```

## Database Schema

**categories**: id, name, icon, color, createdAt
**receipts**: id, storeName, storeAddress, date, currency, subtotal, tax, total, imagePath, categoryId, notes, **status**, **errorMessage**, createdAt, updatedAt
**receipt_items**: id, receiptId, name, inferredName, productType, boundingBox, quantity, unitPrice, totalPrice, discount, sortOrder

Note: Dates stored as Unix timestamps in **seconds** (not milliseconds).
Receipt status: `pending` | `processing` | `completed` | `failed`

## Environment Variables

```env
# AI
GEMINI_API_KEY=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database & Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Completed Features

- [x] Camera/gallery capture with preview
- [x] Gemini 3 Flash OCR integration
- [x] Receipt CRUD operations
- [x] Category assignment
- [x] Receipt list with filtering
- [x] Receipt detail/edit view
- [x] Mobile-first bottom navigation
- [x] Desktop header navigation
- [x] SQLite database with Drizzle ORM
- [x] AI-inferred readable item names (raw name shown on hover)
- [x] AI-inferred product types (e.g., "bread", "milk", "vegetables")
- [x] Bounding boxes for receipt items with hover highlighting
- [x] Desktop split layout (image left, data right)
- [x] Re-analyze button for existing receipts
- [x] Reports page with spending breakdowns
- [x] Period selector (week/month/year/all)
- [x] Period navigation (prev/next arrows)
- [x] Spending by product type (CSS bar chart)
- [x] Top stores list
- [x] Daily spending chart
- [x] Dashboard with real weekly stats
- [x] 20 passing tests
- [x] **Async receipt processing with Vercel Workflow**
- [x] **Fire-and-forget uploads (user can close browser)**
- [x] **Bulk upload with drag-drop**
- [x] **Real-time status updates via SSE**
- [x] **Receipt status badges (pending/processing/completed/failed)**

## Async Processing API

```
POST /api/receipts/queue     # Upload images, start workflow
POST /api/receipts/status    # Batch check status by IDs
GET  /api/receipts/stream    # SSE for real-time updates
```

The workflow uses `"use workflow"` and `"use step"` directives for durable execution with automatic retries.

## Reports API

```
GET /api/reports?period=week&offset=0
```

**Parameters:**
- `period`: `week` | `month` | `year` | `all`
- `offset`: 0 (current), -1 (previous), -2 (two ago), etc.

**Response:**
```typescript
{
  period: { start: Date, end: Date, label: string },
  summary: { totalSpent, receiptCount, itemCount, avgPerReceipt },
  byProductType: [{ productType, totalSpent, itemCount, percentage }],
  byStore: [{ storeName, totalSpent, receiptCount }],
  byDay: [{ date, totalSpent }]
}
```

Week starts on **Monday**.

## Remaining Phases

### Phase 7: Polish
- [ ] Loading states (Suspense)
- [ ] Error handling improvements
- [ ] Empty states
- [ ] Failed receipt retry UI

### Phase 8: Test Coverage
- [ ] Edge case tests
- [ ] Reports API tests
- [ ] Workflow tests
- [ ] Shared test utilities
